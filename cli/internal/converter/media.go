package converter

import (
	"fmt"

	"github.com/noauf/transmute-cli/internal/ffmpeg"
)

func convertMedia(inputPath, outputPath, targetFormat string) error {
	args := buildFFmpegArgs(inputPath, outputPath, targetFormat)
	return mediaConvert(inputPath, outputPath, targetFormat, args)
}

func mediaConvert(inputPath, outputPath, targetFormat string, args []string) error {
	if !ffmpeg.IsAvailable() {
		return fmt.Errorf("ffmpeg is required for %s conversion — run `transmute --install-ffmpeg` to install it", targetFormat)
	}
	return ffmpeg.Run(args...)
}

func buildFFmpegArgs(inputPath, outputPath, targetFormat string) []string {
	args := []string{"-y", "-i", inputPath}

	switch targetFormat {
	// Audio
	case "mp3":
		args = append(args, "-codec:a", "libmp3lame", "-q:a", "2", outputPath)
	case "wav":
		args = append(args, "-codec:a", "pcm_s16le", outputPath)
	case "flac":
		args = append(args, "-codec:a", "flac", outputPath)
	case "ogg":
		args = append(args, "-codec:a", "libvorbis", "-q:a", "6", outputPath)
	case "aac":
		args = append(args, "-codec:a", "aac", "-b:a", "192k", outputPath)
	case "m4a":
		args = append(args, "-codec:a", "aac", "-b:a", "192k", outputPath)
	case "opus":
		args = append(args, "-codec:a", "libopus", "-b:a", "128k", outputPath)

	// Video
	case "mp4":
		args = append(args, "-codec:v", "libx264", "-preset", "medium", "-crf", "23",
			"-codec:a", "aac", "-b:a", "192k", outputPath)
	case "webm":
		args = append(args, "-codec:v", "libvpx-vp9", "-crf", "30", "-b:v", "0",
			"-codec:a", "libvorbis", outputPath)
	case "avi":
		args = append(args, "-codec:v", "mpeg4", "-q:v", "5",
			"-codec:a", "libmp3lame", "-q:a", "4", outputPath)
	case "mov":
		args = append(args, "-codec:v", "libx264", "-preset", "medium", "-crf", "23",
			"-codec:a", "aac", "-b:a", "192k", outputPath)
	case "mkv":
		args = append(args, "-codec:v", "libx264", "-preset", "medium", "-crf", "23",
			"-codec:a", "aac", "-b:a", "192k", outputPath)

	default:
		// Generic: let ffmpeg figure it out from the extension
		args = append(args, outputPath)
	}

	return args
}
