package converter

import (
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"os"
	"os/exec"
	"strings"

	"golang.org/x/image/bmp"
	"golang.org/x/image/tiff"
	"golang.org/x/image/webp"
)

func convertImage(inputPath, outputPath, targetFormat string) error {
	f, err := os.Open(inputPath)
	if err != nil {
		return fmt.Errorf("opening image: %w", err)
	}
	defer f.Close()

	// Decode input — Go's image package auto-registers png, jpeg, gif via import
	// We also need x/image decoders for bmp, tiff, webp
	img, format, err := image.Decode(f)
	if err != nil {
		// Try specific decoders as fallback
		f.Seek(0, 0)
		img, err = tryDecodeImage(f, inputPath)
		if err != nil {
			return fmt.Errorf("decoding image (%s): %w", format, err)
		}
	}

	out, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("creating output: %w", err)
	}
	defer out.Close()

	target := strings.ToLower(targetFormat)
	switch target {
	case "png":
		return png.Encode(out, img)
	case "jpg", "jpeg":
		return jpeg.Encode(out, img, &jpeg.Options{Quality: 92})
	case "gif":
		return gif.Encode(out, img, &gif.Options{NumColors: 256})
	case "bmp":
		return bmp.Encode(out, img)
	case "tiff", "tif":
		return tiff.Encode(out, img, &tiff.Options{Compression: tiff.Deflate})
	case "webp":
		// Go doesn't have a webp encoder in stdlib. Use ffmpeg as fallback.
		out.Close()
		os.Remove(outputPath)
		return convertImageViaFFmpeg(inputPath, outputPath, target)
	case "avif":
		out.Close()
		os.Remove(outputPath)
		return convertImageViaFFmpeg(inputPath, outputPath, target)
	case "ico":
		// ICO is just a small PNG wrapped in ICO container for simple cases.
		// We'll convert to PNG via ffmpeg or write a 256x256 PNG for now.
		out.Close()
		os.Remove(outputPath)
		return convertImageViaFFmpeg(inputPath, outputPath, target)
	default:
		out.Close()
		os.Remove(outputPath)
		return fmt.Errorf("unsupported image target format: %s", target)
	}
}

func tryDecodeImage(f *os.File, path string) (image.Image, error) {
	ext := strings.ToLower(path)
	switch {
	case strings.HasSuffix(ext, ".webp"):
		return webp.Decode(f)
	case strings.HasSuffix(ext, ".bmp"):
		return bmp.Decode(f)
	case strings.HasSuffix(ext, ".tiff"), strings.HasSuffix(ext, ".tif"):
		return tiff.Decode(f)
	default:
		return nil, fmt.Errorf("unable to decode image: %s", path)
	}
}

func convertImageViaFFmpeg(inputPath, outputPath, format string) error {
	// For WebP: prefer cwebp (from libwebp-tools) which is widely available
	if format == "webp" {
		if cwebpPath, err := exec.LookPath("cwebp"); err == nil {
			cmd := exec.Command(cwebpPath, "-q", "90", inputPath, "-o", outputPath)
			if out, err := cmd.CombinedOutput(); err != nil {
				return fmt.Errorf("cwebp error: %w\n%s", err, string(out))
			}
			return nil
		}
	}

	args := []string{"-y", "-i", inputPath}

	switch format {
	case "webp":
		args = append(args, "-quality", "90", outputPath)
	case "avif":
		args = append(args, "-c:v", "libaom-av1", "-still-picture", "1", outputPath)
	case "ico":
		// Scale to 256x256 for ICO
		args = append(args, "-vf", "scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2", outputPath)
	default:
		args = append(args, outputPath)
	}

	return mediaConvert(inputPath, outputPath, format, args)
}
