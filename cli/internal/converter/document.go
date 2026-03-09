package converter

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"

	"github.com/russross/blackfriday/v2"
)

func convertDocument(inputPath, outputPath, sourceExt, targetFormat string) error {
	raw, err := os.ReadFile(inputPath)
	if err != nil {
		return fmt.Errorf("reading document: %w", err)
	}
	content := string(raw)

	switch sourceExt {
	case "txt":
		return convertFromTxt(content, outputPath, targetFormat)
	case "md":
		return convertFromMarkdown(content, outputPath, targetFormat)
	case "html", "htm":
		return convertFromHTML(content, outputPath, targetFormat)
	case "rtf":
		return convertFromRTF(content, outputPath, targetFormat)
	case "docx":
		return convertDocx(inputPath, outputPath, targetFormat)
	case "pdf":
		return convertPdf(inputPath, outputPath, targetFormat)
	default:
		return fmt.Errorf("unsupported document source: %s", sourceExt)
	}
}

// ─── TXT conversions ─────────────────────────────────────────

func convertFromTxt(content, outputPath, target string) error {
	switch target {
	case "html":
		html := "<html><body><pre>" + escapeHTML(content) + "</pre></body></html>"
		return os.WriteFile(outputPath, []byte(html), 0o644)
	case "md":
		return os.WriteFile(outputPath, []byte(content), 0o644)
	case "pdf":
		return textToPDF(content, outputPath)
	default:
		return fmt.Errorf("unsupported target for txt: %s", target)
	}
}

// ─── Markdown conversions ────────────────────────────────────

func convertFromMarkdown(content, outputPath, target string) error {
	switch target {
	case "html":
		html := blackfriday.Run([]byte(content))
		wrapped := "<html><body>" + string(html) + "</body></html>"
		return os.WriteFile(outputPath, []byte(wrapped), 0o644)
	case "txt":
		text := stripMarkdown(content)
		return os.WriteFile(outputPath, []byte(text), 0o644)
	case "pdf":
		html := string(blackfriday.Run([]byte(content)))
		return htmlToPDF(html, outputPath)
	default:
		return fmt.Errorf("unsupported target for md: %s", target)
	}
}

// ─── HTML conversions ────────────────────────────────────────

func convertFromHTML(content, outputPath, target string) error {
	switch target {
	case "txt":
		text := stripHTMLTags(content)
		return os.WriteFile(outputPath, []byte(text), 0o644)
	case "md":
		md := htmlToMarkdown(content)
		return os.WriteFile(outputPath, []byte(md), 0o644)
	case "pdf":
		return htmlToPDF(content, outputPath)
	default:
		return fmt.Errorf("unsupported target for html: %s", target)
	}
}

// ─── RTF conversions ─────────────────────────────────────────

func convertFromRTF(content, outputPath, target string) error {
	text := stripRTF(content)
	switch target {
	case "txt":
		return os.WriteFile(outputPath, []byte(text), 0o644)
	case "html":
		html := "<html><body><pre>" + escapeHTML(text) + "</pre></body></html>"
		return os.WriteFile(outputPath, []byte(html), 0o644)
	case "md":
		return os.WriteFile(outputPath, []byte(text), 0o644)
	default:
		return fmt.Errorf("unsupported target for rtf: %s", target)
	}
}

// ─── DOCX conversions ────────────────────────────────────────

func convertDocx(inputPath, outputPath, target string) error {
	text, err := extractDocxText(inputPath)
	if err != nil {
		return fmt.Errorf("extracting DOCX text: %w", err)
	}

	switch target {
	case "txt":
		return os.WriteFile(outputPath, []byte(text), 0o644)
	case "html":
		html := "<html><body><pre>" + escapeHTML(text) + "</pre></body></html>"
		return os.WriteFile(outputPath, []byte(html), 0o644)
	case "md":
		return os.WriteFile(outputPath, []byte(text), 0o644)
	case "pdf":
		return textToPDF(text, outputPath)
	default:
		return fmt.Errorf("unsupported target for docx: %s", target)
	}
}

// ─── PDF conversions ─────────────────────────────────────────

func convertPdf(inputPath, outputPath, target string) error {
	text, err := extractPDFText(inputPath)
	if err != nil {
		return fmt.Errorf("extracting PDF text: %w", err)
	}

	switch target {
	case "txt":
		return os.WriteFile(outputPath, []byte(text), 0o644)
	case "html":
		html := "<html><body><pre>" + escapeHTML(text) + "</pre></body></html>"
		return os.WriteFile(outputPath, []byte(html), 0o644)
	case "md":
		return os.WriteFile(outputPath, []byte(text), 0o644)
	default:
		return fmt.Errorf("unsupported target for pdf: %s", target)
	}
}

// ─── Helpers ─────────────────────────────────────────────────

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	return s
}

func stripHTMLTags(html string) string {
	var result strings.Builder
	inTag := false
	for _, r := range html {
		switch {
		case r == '<':
			inTag = true
		case r == '>':
			inTag = false
		case !inTag:
			result.WriteRune(r)
		}
	}
	return strings.TrimSpace(result.String())
}

func stripMarkdown(md string) string {
	lines := strings.Split(md, "\n")
	var result []string
	for _, line := range lines {
		line = strings.TrimLeft(line, "# ")
		line = strings.ReplaceAll(line, "**", "")
		line = strings.ReplaceAll(line, "*", "")
		line = strings.ReplaceAll(line, "__", "")
		line = strings.ReplaceAll(line, "_", "")
		line = strings.ReplaceAll(line, "`", "")
		result = append(result, line)
	}
	return strings.Join(result, "\n")
}

func htmlToMarkdown(html string) string {
	md := html
	md = strings.ReplaceAll(md, "<br>", "\n")
	md = strings.ReplaceAll(md, "<br/>", "\n")
	md = strings.ReplaceAll(md, "<br />", "\n")
	md = strings.ReplaceAll(md, "<p>", "\n")
	md = strings.ReplaceAll(md, "</p>", "\n")
	md = strings.ReplaceAll(md, "<strong>", "**")
	md = strings.ReplaceAll(md, "</strong>", "**")
	md = strings.ReplaceAll(md, "<em>", "*")
	md = strings.ReplaceAll(md, "</em>", "*")
	md = strings.ReplaceAll(md, "<h1>", "# ")
	md = strings.ReplaceAll(md, "</h1>", "\n")
	md = strings.ReplaceAll(md, "<h2>", "## ")
	md = strings.ReplaceAll(md, "</h2>", "\n")
	md = strings.ReplaceAll(md, "<h3>", "### ")
	md = strings.ReplaceAll(md, "</h3>", "\n")
	md = stripHTMLTags(md)
	return strings.TrimSpace(md)
}

func stripRTF(rtf string) string {
	var result strings.Builder
	i := 0
	depth := 0
	for i < len(rtf) {
		ch := rtf[i]
		switch {
		case ch == '{':
			depth++
			i++
		case ch == '}':
			depth--
			i++
		case ch == '\\':
			i++
			if i < len(rtf) && rtf[i] == '\'' {
				i += 3
			} else {
				for i < len(rtf) && ((rtf[i] >= 'a' && rtf[i] <= 'z') || (rtf[i] >= 'A' && rtf[i] <= 'Z')) {
					i++
				}
				for i < len(rtf) && ((rtf[i] >= '0' && rtf[i] <= '9') || rtf[i] == '-') {
					i++
				}
				if i < len(rtf) && rtf[i] == ' ' {
					i++
				}
			}
		default:
			if depth <= 1 {
				result.WriteByte(ch)
			}
			i++
		}
	}
	return strings.TrimSpace(result.String())
}

// extractDocxText extracts plain text from a .docx file (ZIP of XML files).
func extractDocxText(path string) (string, error) {
	r, err := zip.OpenReader(path)
	if err != nil {
		return "", fmt.Errorf("opening docx: %w", err)
	}
	defer r.Close()

	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return "", err
			}
			defer rc.Close()
			data, err := io.ReadAll(rc)
			if err != nil {
				return "", err
			}
			return stripHTMLTags(string(data)), nil
		}
	}
	return "", fmt.Errorf("word/document.xml not found in docx")
}

// extractPDFText tries pdftotext (poppler-utils), falls back to error.
func extractPDFText(path string) (string, error) {
	pdftotextPath, err := exec.LookPath("pdftotext")
	if err != nil {
		return "", fmt.Errorf("PDF text extraction requires 'pdftotext' — install poppler-utils")
	}
	out, err := exec.Command(pdftotextPath, path, "-").CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("pdftotext failed: %w\n%s", err, string(out))
	}
	return string(out), nil
}

// textToPDF creates a basic PDF from plain text.
func textToPDF(text, outputPath string) error {
	lines := strings.Split(text, "\n")
	var content strings.Builder

	content.WriteString("%PDF-1.4\n")
	content.WriteString("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
	content.WriteString("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

	var stream strings.Builder
	stream.WriteString("BT\n/F1 10 Tf\n")
	y := 780.0
	for _, line := range lines {
		if y < 40 {
			break
		}
		safe := strings.ReplaceAll(line, "\\", "\\\\")
		safe = strings.ReplaceAll(safe, "(", "\\(")
		safe = strings.ReplaceAll(safe, ")", "\\)")
		stream.WriteString(fmt.Sprintf("1 0 0 1 40 %.0f Tm\n(%s) Tj\n", y, safe))
		y -= 14
	}
	stream.WriteString("ET\n")
	streamBytes := stream.String()

	content.WriteString(fmt.Sprintf("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"))
	content.WriteString(fmt.Sprintf("4 0 obj\n<< /Length %d >>\nstream\n%sendstream\nendobj\n", len(streamBytes), streamBytes))
	content.WriteString("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
	content.WriteString("xref\n0 6\n")
	content.WriteString("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n")

	return os.WriteFile(outputPath, []byte(content.String()), 0o644)
}

func htmlToPDF(html, outputPath string) error {
	text := stripHTMLTags(html)
	return textToPDF(text, outputPath)
}
