package update

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"strings"
)

const (
	// CurrentVersion is the embedded build version. Updated at release time.
	CurrentVersion = "0.1.4"

	repoOwner = "noauf"
	repoName  = "Transmute"
	apiURL    = "https://api.github.com/repos/" + repoOwner + "/" + repoName + "/releases/latest"
)

// ghRelease is the subset of the GitHub release JSON we care about.
type ghRelease struct {
	TagName string    `json:"tag_name"`
	Assets  []ghAsset `json:"assets"`
}

type ghAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// Check queries GitHub for the latest release and reports whether an update
// is available, and if so, which version.
func Check() (available bool, latestVersion string, err error) {
	rel, err := fetchLatest()
	if err != nil {
		return false, "", err
	}
	latest := strings.TrimPrefix(rel.TagName, "v")
	if latest == CurrentVersion {
		return false, latest, nil
	}
	return true, latest, nil
}

// Run performs a self-update: download the latest release binary and replace
// the current executable.
func Run(progress func(string)) error {
	progress("Checking for updates...")

	rel, err := fetchLatest()
	if err != nil {
		return fmt.Errorf("failed to check for updates: %w", err)
	}

	latest := strings.TrimPrefix(rel.TagName, "v")
	if latest == CurrentVersion {
		progress(fmt.Sprintf("Already up to date (v%s)", CurrentVersion))
		return nil
	}

	progress(fmt.Sprintf("Update available: v%s -> v%s", CurrentVersion, latest))

	// Find the matching asset for this OS/arch
	assetName := buildAssetName()
	var downloadURL string
	for _, a := range rel.Assets {
		if a.Name == assetName {
			downloadURL = a.BrowserDownloadURL
			break
		}
	}
	if downloadURL == "" {
		return fmt.Errorf("no release binary found for %s/%s (expected %s)", runtime.GOOS, runtime.GOARCH, assetName)
	}

	progress(fmt.Sprintf("Downloading %s...", assetName))

	// Download to a temp file
	tmpFile, err := downloadAsset(downloadURL)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}
	defer os.Remove(tmpFile)

	// Extract binary from tarball (or use directly if not a tarball)
	var binaryPath string
	if strings.HasSuffix(assetName, ".tar.gz") {
		binaryPath, err = extractTarGz(tmpFile)
		if err != nil {
			return fmt.Errorf("failed to extract archive: %w", err)
		}
		defer os.Remove(binaryPath)
	} else {
		binaryPath = tmpFile
	}

	// Replace the current executable
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("cannot determine executable path: %w", err)
	}

	progress("Installing update...")

	if err := replaceExecutable(exePath, binaryPath); err != nil {
		return fmt.Errorf("failed to replace executable: %w", err)
	}

	progress(fmt.Sprintf("Updated to v%s", latest))
	return nil
}

func fetchLatest() (*ghRelease, error) {
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "transmute-cli/"+CurrentVersion)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}

	var rel ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return nil, err
	}
	return &rel, nil
}

// buildAssetName returns the expected asset filename for the current platform.
// Convention: transmute-<os>-<arch>.tar.gz  (or .zip for Windows)
func buildAssetName() string {
	goos := runtime.GOOS
	arch := runtime.GOARCH

	// Normalize arch names
	switch arch {
	case "amd64":
		arch = "x86_64"
	case "arm64":
		arch = "arm64"
	}

	if goos == "windows" {
		return fmt.Sprintf("transmute-%s-%s.zip", goos, arch)
	}

	return fmt.Sprintf("transmute-%s-%s.tar.gz", goos, arch)
}

func downloadAsset(url string) (string, error) {
	resp, err := http.Get(url) //nolint:gosec
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("download returned HTTP %d", resp.StatusCode)
	}

	tmp, err := os.CreateTemp("", "transmute-update-*")
	if err != nil {
		return "", err
	}

	if _, err := io.Copy(tmp, resp.Body); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return "", err
	}
	tmp.Close()
	return tmp.Name(), nil
}

func extractTarGz(archivePath string) (string, error) {
	f, err := os.Open(archivePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	gz, err := gzip.NewReader(f)
	if err != nil {
		return "", err
	}
	defer gz.Close()

	tr := tar.NewReader(gz)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", err
		}

		// Look for the transmute binary
		name := hdr.Name
		if strings.HasSuffix(name, "/transmute") || name == "transmute" {
			tmp, err := os.CreateTemp("", "transmute-bin-*")
			if err != nil {
				return "", err
			}
			if _, err := io.Copy(tmp, tr); err != nil {
				tmp.Close()
				os.Remove(tmp.Name())
				return "", err
			}
			tmp.Close()
			if err := os.Chmod(tmp.Name(), 0o755); err != nil {
				return "", err
			}
			return tmp.Name(), nil
		}
	}

	return "", fmt.Errorf("transmute binary not found in archive")
}

func replaceExecutable(target, replacement string) error {
	// Read the new binary
	data, err := os.ReadFile(replacement)
	if err != nil {
		return err
	}

	// Get current executable's permissions
	info, err := os.Stat(target)
	if err != nil {
		return err
	}

	// Write new binary to a temp file next to the target
	tmpPath := target + ".new"
	if err := os.WriteFile(tmpPath, data, info.Mode()); err != nil {
		return err
	}

	// Atomic rename
	if err := os.Rename(tmpPath, target); err != nil {
		os.Remove(tmpPath)
		return err
	}

	return nil
}
