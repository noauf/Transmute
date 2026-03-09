package converter

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// convertFont handles font format conversions.
// Go doesn't have native font conversion libraries, so we use fonttools (Python) or ffmpeg
// as external dependencies. For a CLI tool this is acceptable — we check for fonttools first.
func convertFont(inputPath, outputPath, sourceExt, targetFormat string) error {
	// Font conversion is complex — the most reliable approach is using fonttools/pyftsubset.
	// We'll try a simple copy-based approach for woff/woff2 ↔ ttf/otf since the underlying
	// data is similar, but for proper conversion we'd need external tools.

	// For now, provide a clear error explaining what's needed.
	// In the future we could bundle a Go-native font converter or auto-install fonttools.

	switch {
	case (sourceExt == "ttf" || sourceExt == "otf") && (targetFormat == "woff" || targetFormat == "woff2"):
		return fontConvertViaFFmpeg(inputPath, outputPath)
	case (sourceExt == "woff" || sourceExt == "woff2") && (targetFormat == "ttf" || targetFormat == "otf"):
		return fontConvertViaFFmpeg(inputPath, outputPath)
	case sourceExt == "ttf" && targetFormat == "otf":
		return fontConvertViaFFmpeg(inputPath, outputPath)
	case sourceExt == "otf" && targetFormat == "ttf":
		return fontConvertViaFFmpeg(inputPath, outputPath)
	case sourceExt == "woff" && targetFormat == "woff2":
		return fontConvertViaFFmpeg(inputPath, outputPath)
	case sourceExt == "woff2" && targetFormat == "woff":
		return fontConvertViaFFmpeg(inputPath, outputPath)
	default:
		return fmt.Errorf("font conversion from %s to %s is not supported", sourceExt, targetFormat)
	}
}

// fontConvertViaFFmpeg attempts font conversion. FFmpeg doesn't actually handle fonts,
// so we check for fonttools (Python pyftsubset/fonttools CLI).
func fontConvertViaFFmpeg(inputPath, outputPath string) error {
	// Check if fonttools is available
	// fonttools provides `pyftsubset` and `fonttools` CLI
	// For simple conversions: fonttools ttLib can convert between formats

	// Write a small Python script to do the conversion
	script := fmt.Sprintf(`
import sys
try:
    from fontTools.ttLib import TTFont
    font = TTFont("%s")
    font.save("%s")
    print("OK")
except ImportError:
    print("ERROR: fonttools not installed. Run: pip install fonttools brotli")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
`, inputPath, outputPath)

	tmpScript, err := os.CreateTemp("", "transmute-font-*.py")
	if err != nil {
		return fmt.Errorf("creating temp script: %w", err)
	}
	defer os.Remove(tmpScript.Name())

	if _, err := tmpScript.WriteString(script); err != nil {
		tmpScript.Close()
		return err
	}
	tmpScript.Close()

	// Try python3 first, then python
	for _, pyCmd := range []string{"python3", "python"} {
		output, err := runPython(pyCmd, tmpScript.Name())
		if err == nil {
			if output == "OK" || len(output) > 0 {
				return nil
			}
		}
	}

	return fmt.Errorf("font conversion requires Python + fonttools. Install with: pip install fonttools brotli")
}

func runPython(python, scriptPath string) (string, error) {
	cmd := exec.Command(python, scriptPath)
	out, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(out)), err
}
