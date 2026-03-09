package ffmpeg

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// cacheDir returns the directory where transmute stores its ffmpeg binary.
// ~/.transmute/bin/
func cacheDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".transmute", "bin"), nil
}

// BinaryPath returns the expected path to the ffmpeg binary inside our cache.
func BinaryPath() (string, error) {
	dir, err := cacheDir()
	if err != nil {
		return "", err
	}
	name := "ffmpeg"
	if runtime.GOOS == "windows" {
		name = "ffmpeg.exe"
	}
	return filepath.Join(dir, name), nil
}

// Resolve returns a usable ffmpeg path. It checks:
// 1. Our managed cache dir
// 2. System PATH
// Returns empty string + error if not found anywhere.
func Resolve() (string, error) {
	// Check our cache first
	p, err := BinaryPath()
	if err == nil {
		if _, statErr := os.Stat(p); statErr == nil {
			return p, nil
		}
	}

	// Check system PATH
	if sysPath, err := exec.LookPath("ffmpeg"); err == nil {
		return sysPath, nil
	}

	return "", errors.New("ffmpeg not found — run `transmute --install-ffmpeg` or install it manually")
}

// IsAvailable returns true if ffmpeg can be resolved.
func IsAvailable() bool {
	_, err := Resolve()
	return err == nil
}

// downloadURL returns the URL for a static ffmpeg build for the current platform.
// Uses https://github.com/eugeneware/ffmpeg-static releases (widely used, MIT).
func downloadURL() (string, error) {
	goos := runtime.GOOS
	goarch := runtime.GOARCH

	// Map Go os/arch to ffmpeg-static naming
	var platform string
	switch {
	case goos == "darwin" && goarch == "arm64":
		platform = "darwin-arm64"
	case goos == "darwin" && goarch == "amd64":
		platform = "darwin-x64"
	case goos == "linux" && goarch == "amd64":
		platform = "linux-x64"
	case goos == "linux" && goarch == "arm64":
		platform = "linux-arm64"
	case goos == "windows" && goarch == "amd64":
		platform = "win32-x64"
	default:
		return "", fmt.Errorf("unsupported platform: %s/%s", goos, goarch)
	}

	// Use johnvansickle static builds for linux, evermeet for mac, gyan.dev for windows
	switch goos {
	case "darwin":
		// evermeet.cx provides universal macOS ffmpeg builds
		return "https://evermeet.cx/ffmpeg/getrelease/zip", nil
	case "linux":
		// johnvansickle provides static Linux builds
		base := "https://johnvansickle.com/ffmpeg/releases/"
		switch goarch {
		case "amd64":
			return base + "ffmpeg-release-amd64-static.tar.xz", nil
		case "arm64":
			return base + "ffmpeg-release-arm64-static.tar.xz", nil
		}
	case "windows":
		return "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip", nil
	}

	_ = platform // suppress unused
	return "", fmt.Errorf("unsupported platform: %s/%s", goos, goarch)
}

// Download fetches and installs ffmpeg into ~/.transmute/bin/.
// The progress callback receives bytes downloaded so far.
func Download(progress func(downloaded int64)) error {
	url, err := downloadURL()
	if err != nil {
		return err
	}

	dir, err := cacheDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating cache dir: %w", err)
	}

	binPath, err := BinaryPath()
	if err != nil {
		return err
	}

	// Download to temp file
	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return fmt.Errorf("downloading ffmpeg: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed: HTTP %d", resp.StatusCode)
	}

	tmpFile, err := os.CreateTemp(dir, "ffmpeg-download-*")
	if err != nil {
		return fmt.Errorf("creating temp file: %w", err)
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	var reader io.Reader = resp.Body
	if progress != nil {
		reader = &progressReader{r: resp.Body, fn: progress}
	}

	if _, err := io.Copy(tmpFile, reader); err != nil {
		tmpFile.Close()
		return fmt.Errorf("saving download: %w", err)
	}
	tmpFile.Close()

	// Extract based on file type
	switch {
	case strings.HasSuffix(url, ".zip"):
		if err := extractFromZip(tmpPath, binPath); err != nil {
			return err
		}
	case strings.HasSuffix(url, ".tar.xz"), strings.HasSuffix(url, ".tar.gz"):
		if err := extractFromTarball(tmpPath, binPath); err != nil {
			return err
		}
	default:
		// Direct binary
		if err := os.Rename(tmpPath, binPath); err != nil {
			return err
		}
	}

	// Make executable
	return os.Chmod(binPath, 0o755)
}

func extractFromZip(zipPath, destBin string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("opening zip: %w", err)
	}
	defer r.Close()

	for _, f := range r.File {
		name := filepath.Base(f.Name)
		if name == "ffmpeg" || name == "ffmpeg.exe" {
			rc, err := f.Open()
			if err != nil {
				return err
			}
			defer rc.Close()

			out, err := os.Create(destBin)
			if err != nil {
				return err
			}
			defer out.Close()

			_, err = io.Copy(out, rc)
			return err
		}
	}
	return errors.New("ffmpeg binary not found in zip archive")
}

func extractFromTarball(tarPath, destBin string) error {
	f, err := os.Open(tarPath)
	if err != nil {
		return err
	}
	defer f.Close()

	var reader io.Reader
	// Try gzip first — xz would need a separate lib, but we'll handle .tar.gz here
	gz, err := gzip.NewReader(f)
	if err != nil {
		// Not gzip — for .tar.xz we'd need an xz decompressor.
		// Fallback: try to use system xz command
		f.Close()
		return extractWithSystemXZ(tarPath, destBin)
	}
	defer gz.Close()
	reader = gz

	tr := tar.NewReader(reader)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		name := filepath.Base(hdr.Name)
		if name == "ffmpeg" {
			out, err := os.Create(destBin)
			if err != nil {
				return err
			}
			defer out.Close()
			_, err = io.Copy(out, tr)
			return err
		}
	}
	return errors.New("ffmpeg binary not found in tarball")
}

func extractWithSystemXZ(tarPath, destBin string) error {
	// Use system xz to decompress, then extract with tar
	dir := filepath.Dir(destBin)
	cmd := exec.Command("sh", "-c",
		fmt.Sprintf("xz -dc %q | tar -xf - -C %q --strip-components=1", tarPath, dir))
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("extracting with xz: %w (is xz installed?)", err)
	}

	// Look for the ffmpeg binary in the extracted files
	extracted := filepath.Join(dir, "ffmpeg")
	if _, err := os.Stat(extracted); err == nil {
		return nil // Already in the right place
	}

	// Walk to find it
	var found string
	filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if filepath.Base(path) == "ffmpeg" && !info.IsDir() {
			found = path
			return filepath.SkipAll
		}
		return nil
	})

	if found == "" {
		return errors.New("ffmpeg binary not found after extraction")
	}
	if found != destBin {
		return os.Rename(found, destBin)
	}
	return nil
}

// Run executes ffmpeg with the given arguments, returning combined output on error.
func Run(args ...string) error {
	bin, err := Resolve()
	if err != nil {
		return err
	}
	cmd := exec.Command(bin, args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg error: %w\n%s", err, string(output))
	}
	return nil
}

// RunWithOutput executes ffmpeg and returns stdout.
func RunWithOutput(args ...string) ([]byte, error) {
	bin, err := Resolve()
	if err != nil {
		return nil, err
	}
	cmd := exec.Command(bin, args...)
	return cmd.CombinedOutput()
}

// progressReader wraps an io.Reader and reports progress.
type progressReader struct {
	r     io.Reader
	fn    func(int64)
	total int64
}

func (pr *progressReader) Read(p []byte) (int, error) {
	n, err := pr.r.Read(p)
	pr.total += int64(n)
	if pr.fn != nil {
		pr.fn(pr.total)
	}
	return n, err
}
