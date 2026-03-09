package converter

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/noauf/transmute-cli/internal/detect"
)

// Result holds the outcome of a single conversion.
type Result struct {
	InputPath  string
	OutputPath string
	Err        error
}

// Convert is the main entry point. It routes to the correct converter based on
// the source file's category.
func Convert(inputPath, targetFormat, outputDir string) Result {
	ext := strings.TrimPrefix(filepath.Ext(inputPath), ".")
	ext = strings.ToLower(ext)

	cat := detect.DetectCategory(ext)

	// Determine output path
	base := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	dir := filepath.Dir(inputPath)
	if outputDir != "" {
		dir = outputDir
	}
	outPath := filepath.Join(dir, base+"."+targetFormat)

	// Avoid overwriting — append _converted if output == input
	if outPath == inputPath {
		outPath = filepath.Join(dir, base+"_converted."+targetFormat)
	}

	var err error
	switch cat {
	case detect.CategoryImage:
		err = convertImage(inputPath, outPath, targetFormat)
	case detect.CategoryDocument:
		err = convertDocument(inputPath, outPath, ext, targetFormat)
	case detect.CategoryAudio, detect.CategoryVideo:
		err = convertMedia(inputPath, outPath, targetFormat)
	case detect.CategoryData:
		err = convertData(inputPath, outPath, ext, targetFormat)
	case detect.CategorySpreadsheet:
		err = convertSpreadsheet(inputPath, outPath, ext, targetFormat)
	case detect.CategoryFont:
		err = convertFont(inputPath, outPath, ext, targetFormat)
	default:
		err = fmt.Errorf("unsupported file type: %s", ext)
	}

	return Result{
		InputPath:  inputPath,
		OutputPath: outPath,
		Err:        err,
	}
}

// OutputPath computes what the output path would be without performing conversion.
func OutputPath(inputPath, targetFormat, outputDir string) string {
	base := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	dir := filepath.Dir(inputPath)
	if outputDir != "" {
		dir = outputDir
	}
	outPath := filepath.Join(dir, base+"."+targetFormat)
	if outPath == inputPath {
		outPath = filepath.Join(dir, base+"_converted."+targetFormat)
	}
	return outPath
}
