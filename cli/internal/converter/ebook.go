package converter

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/russross/blackfriday/v2"
)

// convertEbook handles epub ↔ txt/html/md/pdf conversions.
func convertEbook(inputPath, outputPath, sourceExt, targetFormat string) error {
	if sourceExt == "epub" {
		return convertFromEpub(inputPath, outputPath, targetFormat)
	}
	// txt/html/md → epub
	return convertToEpub(inputPath, outputPath, sourceExt)
}

// ─── EPUB → other formats ────────────────────────────────────

func convertFromEpub(inputPath, outputPath, targetFormat string) error {
	title, htmlChapters, err := extractEpubContent(inputPath)
	if err != nil {
		return fmt.Errorf("reading epub: %w", err)
	}

	fullHTML := strings.Join(htmlChapters, "\n<hr/>\n")

	switch targetFormat {
	case "txt":
		text := stripHTMLTags(fullHTML)
		return os.WriteFile(outputPath, []byte(text), 0o644)
	case "html":
		styled := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>%s</title>
<style>body{font-family:serif;line-height:1.7;max-width:700px;margin:40px auto;padding:0 20px;color:#1a1a1a}h1,h2,h3{margin-top:1.5em}</style>
</head><body><h1>%s</h1>%s</body></html>`, escapeHTML(title), escapeHTML(title), fullHTML)
		return os.WriteFile(outputPath, []byte(styled), 0o644)
	case "md":
		md := "# " + title + "\n\n" + ebookHTMLToMarkdown(fullHTML)
		return os.WriteFile(outputPath, []byte(md), 0o644)
	case "pdf":
		text := stripHTMLTags(fullHTML)
		return textToPDF(text, outputPath)
	default:
		return fmt.Errorf("unsupported target for epub: %s", targetFormat)
	}
}

// ─── Other formats → EPUB ────────────────────────────────────

func convertToEpub(inputPath, outputPath, sourceExt string) error {
	raw, err := os.ReadFile(inputPath)
	if err != nil {
		return fmt.Errorf("reading input: %w", err)
	}
	content := string(raw)
	title := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))

	var htmlContent string
	switch sourceExt {
	case "txt":
		// Split into paragraphs on double newlines
		paragraphs := strings.Split(content, "\n\n")
		var sb strings.Builder
		for _, p := range paragraphs {
			p = strings.TrimSpace(p)
			if p != "" {
				sb.WriteString("<p>" + escapeHTML(p) + "</p>\n")
			}
		}
		htmlContent = sb.String()
	case "html", "htm":
		// Extract body if full document
		bodyRe := regexp.MustCompile(`(?is)<body[^>]*>(.*)</body>`)
		if m := bodyRe.FindStringSubmatch(content); m != nil {
			htmlContent = m[1]
		} else {
			htmlContent = content
		}
	case "md":
		htmlBytes := blackfriday.Run([]byte(content))
		htmlContent = string(htmlBytes)
	default:
		return fmt.Errorf("unsupported source for epub creation: %s", sourceExt)
	}

	return writeEpubFile(outputPath, title, htmlContent)
}

// ─── EPUB reader ─────────────────────────────────────────────

func extractEpubContent(path string) (string, []string, error) {
	r, err := zip.OpenReader(path)
	if err != nil {
		return "", nil, err
	}
	defer r.Close()

	title := "Untitled"
	var htmlChapters []string

	// Find OPF file via container.xml
	var opfPath string
	for _, f := range r.File {
		if f.Name == "META-INF/container.xml" {
			data, err := readZipFile(f)
			if err != nil {
				break
			}
			re := regexp.MustCompile(`full-path="([^"]+)"`)
			if m := re.FindStringSubmatch(string(data)); m != nil {
				opfPath = m[1]
			}
			break
		}
	}

	if opfPath != "" {
		// Read OPF
		opfContent := ""
		for _, f := range r.File {
			if f.Name == opfPath {
				data, err := readZipFile(f)
				if err == nil {
					opfContent = string(data)
				}
				break
			}
		}

		if opfContent != "" {
			// Extract title
			titleRe := regexp.MustCompile(`<dc:title[^>]*>([^<]+)</dc:title>`)
			if m := titleRe.FindStringSubmatch(opfContent); m != nil {
				title = m[1]
			}

			// Build manifest map: id -> href
			manifest := make(map[string]string)
			itemRe := regexp.MustCompile(`<item[^>]*id="([^"]*)"[^>]*href="([^"]*)"[^>]*`)
			for _, m := range itemRe.FindAllStringSubmatch(opfContent, -1) {
				manifest[m[1]] = m[2]
			}
			// Also handle reversed attr order
			itemRe2 := regexp.MustCompile(`<item[^>]*href="([^"]*)"[^>]*id="([^"]*)"[^>]*`)
			for _, m := range itemRe2.FindAllStringSubmatch(opfContent, -1) {
				manifest[m[2]] = m[1]
			}

			// Get spine order
			var spineIDs []string
			spineRe := regexp.MustCompile(`<itemref[^>]*idref="([^"]*)"[^>]*`)
			for _, m := range spineRe.FindAllStringSubmatch(opfContent, -1) {
				spineIDs = append(spineIDs, m[1])
			}

			// Resolve relative to OPF dir
			opfDir := ""
			if idx := strings.LastIndex(opfPath, "/"); idx >= 0 {
				opfDir = opfPath[:idx+1]
			}

			// Build a map of zip files for quick lookup
			zipFiles := make(map[string]*zip.File)
			for _, f := range r.File {
				zipFiles[f.Name] = f
			}

			for _, id := range spineIDs {
				href, ok := manifest[id]
				if !ok {
					continue
				}
				fullPath := opfDir + href
				zf, ok := zipFiles[fullPath]
				if !ok {
					continue
				}
				data, err := readZipFile(zf)
				if err != nil {
					continue
				}
				// Extract body content
				bodyRe := regexp.MustCompile(`(?is)<body[^>]*>(.*)</body>`)
				if m := bodyRe.FindStringSubmatch(string(data)); m != nil {
					htmlChapters = append(htmlChapters, m[1])
				} else {
					htmlChapters = append(htmlChapters, string(data))
				}
			}
		}
	}

	// Fallback: scan for any xhtml/html files
	if len(htmlChapters) == 0 {
		var htmlFiles []*zip.File
		htmlRe := regexp.MustCompile(`(?i)\.(x?html?)$`)
		for _, f := range r.File {
			if htmlRe.MatchString(f.Name) {
				htmlFiles = append(htmlFiles, f)
			}
		}
		sort.Slice(htmlFiles, func(i, j int) bool {
			return htmlFiles[i].Name < htmlFiles[j].Name
		})
		for _, f := range htmlFiles {
			data, err := readZipFile(f)
			if err != nil {
				continue
			}
			bodyRe := regexp.MustCompile(`(?is)<body[^>]*>(.*)</body>`)
			if m := bodyRe.FindStringSubmatch(string(data)); m != nil {
				htmlChapters = append(htmlChapters, m[1])
			} else {
				htmlChapters = append(htmlChapters, string(data))
			}
		}
	}

	return title, htmlChapters, nil
}

func readZipFile(f *zip.File) ([]byte, error) {
	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(rc)
}

// ─── EPUB writer ─────────────────────────────────────────────

func writeEpubFile(outputPath, title, htmlContent string) error {
	f, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer f.Close()

	w := zip.NewWriter(f)
	defer w.Close()

	uid := fmt.Sprintf("transmute-%d", time.Now().UnixNano())
	modified := time.Now().UTC().Format("2006-01-02T15:04:05Z")

	// mimetype (must be stored, not compressed)
	mimeHeader := &zip.FileHeader{
		Name:   "mimetype",
		Method: zip.Store,
	}
	mw, err := w.CreateHeader(mimeHeader)
	if err != nil {
		return err
	}
	mw.Write([]byte("application/epub+zip"))

	// META-INF/container.xml
	cw, _ := w.Create("META-INF/container.xml")
	cw.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`))

	// OEBPS/content.opf
	ow, _ := w.Create("OEBPS/content.opf")
	ow.Write([]byte(fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">%s</dc:identifier>
    <dc:title>%s</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">%s</meta>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`, uid, escapeHTML(title), modified)))

	// OEBPS/nav.xhtml
	nw, _ := w.Create("OEBPS/nav.xhtml")
	nw.Write([]byte(fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol><li><a href="chapter1.xhtml">%s</a></li></ol>
  </nav>
</body>
</html>`, escapeHTML(title))))

	// OEBPS/chapter1.xhtml
	chw, _ := w.Create("OEBPS/chapter1.xhtml")
	chw.Write([]byte(fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>%s</title>
<style>
  body { font-family: serif; line-height: 1.6; margin: 1em; }
  h1, h2, h3 { margin-top: 1.5em; }
  p { margin: 0.5em 0; }
</style>
</head>
<body>
%s
</body>
</html>`, escapeHTML(title), htmlContent)))

	return nil
}

// ─── Helpers ─────────────────────────────────────────────────

func ebookHTMLToMarkdown(html string) string {
	md := html
	// Headers
	for i := 6; i >= 1; i-- {
		prefix := strings.Repeat("#", i) + " "
		openTag := fmt.Sprintf("<h%d>", i)
		closeTag := fmt.Sprintf("</h%d>", i)
		md = strings.ReplaceAll(md, openTag, prefix)
		md = strings.ReplaceAll(md, closeTag, "\n\n")
		// Also case-insensitive with attributes
		re := regexp.MustCompile(fmt.Sprintf(`(?i)<h%d[^>]*>`, i))
		md = re.ReplaceAllString(md, prefix)
		re2 := regexp.MustCompile(fmt.Sprintf(`(?i)</h%d>`, i))
		md = re2.ReplaceAllString(md, "\n\n")
	}
	md = strings.ReplaceAll(md, "<strong>", "**")
	md = strings.ReplaceAll(md, "</strong>", "**")
	md = strings.ReplaceAll(md, "<b>", "**")
	md = strings.ReplaceAll(md, "</b>", "**")
	md = strings.ReplaceAll(md, "<em>", "*")
	md = strings.ReplaceAll(md, "</em>", "*")
	md = strings.ReplaceAll(md, "<i>", "*")
	md = strings.ReplaceAll(md, "</i>", "*")
	md = strings.ReplaceAll(md, "<br>", "\n")
	md = strings.ReplaceAll(md, "<br/>", "\n")
	md = strings.ReplaceAll(md, "<br />", "\n")
	md = strings.ReplaceAll(md, "<p>", "\n")
	md = strings.ReplaceAll(md, "</p>", "\n")
	md = strings.ReplaceAll(md, "<hr/>", "\n---\n")
	md = strings.ReplaceAll(md, "<hr>", "\n---\n")
	md = strings.ReplaceAll(md, "<hr />", "\n---\n")
	// Strip remaining tags
	md = stripHTMLTags(md)
	return strings.TrimSpace(md)
}
