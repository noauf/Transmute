package converter

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConvertImage(t *testing.T) {
	// Find a test PNG file
	testFile := filepath.Join("..", "..", "..", "public", "logo.png")
	if _, err := os.Stat(testFile); err != nil {
		t.Skipf("test file not found: %s", testFile)
	}

	outDir := t.TempDir()
	result := Convert(testFile, "webp", outDir)
	if result.Err != nil {
		t.Fatalf("conversion failed: %v", result.Err)
	}

	info, err := os.Stat(result.OutputPath)
	if err != nil {
		t.Fatalf("output file not found: %v", err)
	}

	t.Logf("Converted %s -> %s (%d bytes)", testFile, result.OutputPath, info.Size())
}
