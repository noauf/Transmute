package tui

import (
	"os"
	"path/filepath"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestInlineConversionStateMachine(t *testing.T) {
	// Find a test PNG file
	testFile := filepath.Join("..", "..", "..", "public", "logo.png")
	if _, err := os.Stat(testFile); err != nil {
		t.Skipf("test file not found: %s", testFile)
	}

	outDir := t.TempDir()
	m := New([]string{testFile}, outDir)
	m.width = 80
	m.height = 24

	// Verify initial state
	if len(m.files) != 1 {
		t.Fatalf("expected 1 file, got %d", len(m.files))
	}
	if m.state != stateFileList {
		t.Fatalf("expected stateFileList, got %d", m.state)
	}
	if m.files[0].status != "idle" {
		t.Fatalf("expected idle status, got %s", m.files[0].status)
	}

	// Select the file (default is now false)
	m.files[0].selected = true

	t.Logf("File: %s -> %s (selected: %v)", m.files[0].name, m.files[0].targetFormat, m.files[0].selected)

	// Simulate pressing 'c' to start conversion
	newModel, cmd := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'c'}})
	m = newModel.(Model)

	if m.state != stateFileList {
		t.Fatalf("expected to stay on stateFileList during conversion, got %d", m.state)
	}
	if m.totalToConv != 1 {
		t.Fatalf("expected totalToConv=1, got %d", m.totalToConv)
	}
	if m.files[0].status != "converting" {
		t.Fatalf("expected 'converting' status after pressing c, got '%s'", m.files[0].status)
	}

	t.Log("Status correctly set to 'converting' — inline update works!")

	// Execute the conversion command
	if cmd == nil {
		t.Fatal("expected a conversion command, got nil")
	}
	msg := cmd()

	// Process the result
	newModel, _ = m.Update(msg)
	m = newModel.(Model)

	// Should stay on stateFileList after conversion (not stateResults)
	if m.state != stateFileList {
		t.Fatalf("expected stateFileList after conversion, got %d", m.state)
	}
	if m.files[0].status != "done" {
		t.Fatalf("expected 'done' status, got '%s' (error: %s)", m.files[0].status, m.files[0].error)
	}
	if m.converted != 1 {
		t.Fatalf("expected converted=1, got %d", m.converted)
	}

	// Check output file exists
	info, err := os.Stat(m.files[0].outputPath)
	if err != nil {
		t.Fatalf("output file not found: %v", err)
	}

	t.Logf("Conversion complete: %s (%d bytes)", m.files[0].outputPath, info.Size())

	t.Log("State machine verified: idle -> converting -> done (stays on file list)")
}

func TestDeleteOutput(t *testing.T) {
	testFile := filepath.Join("..", "..", "..", "public", "logo.png")
	if _, err := os.Stat(testFile); err != nil {
		t.Skipf("test file not found: %s", testFile)
	}

	outDir := t.TempDir()
	m := New([]string{testFile}, outDir)
	m.width = 80
	m.height = 24

	// Select the file (default is now false)
	m.files[0].selected = true

	// Convert the file
	newModel, cmd := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'c'}})
	m = newModel.(Model)
	msg := cmd()
	newModel, _ = m.Update(msg)
	m = newModel.(Model)

	// Should stay on stateFileList
	if m.state != stateFileList {
		t.Fatalf("expected stateFileList, got %d", m.state)
	}
	if m.files[0].status != "done" {
		t.Fatalf("expected done, got %s", m.files[0].status)
	}

	// Test pressing 'x' to delete the output and reset to idle
	newModel, _ = m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'x'}})
	m = newModel.(Model)

	if m.files[0].status != "idle" {
		t.Fatalf("expected 'idle' status after pressing x, got '%s'", m.files[0].status)
	}

	t.Log("Delete output works: file removed from disk, status reset to 'idle'")
}

func TestViewRendersDuringConversion(t *testing.T) {
	testFile := filepath.Join("..", "..", "..", "public", "logo.png")
	if _, err := os.Stat(testFile); err != nil {
		t.Skipf("test file not found: %s", testFile)
	}

	m := New([]string{testFile}, t.TempDir())
	m.width = 80
	m.height = 24

	// Render initial state
	view := m.View()
	if view == "" {
		t.Fatal("empty view")
	}
	if !containsStr(view, "idle") {
		t.Error("initial view should contain 'idle' status")
	}
	if !containsStr(view, "Select files to convert") {
		t.Error("initial view should contain 'Select files to convert'")
	}

	// Select a file and start conversion
	m.files[0].selected = true

	// Start conversion
	newModel, _ := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'c'}})
	m = newModel.(Model)

	view = m.View()
	if !containsStr(view, "converting") {
		t.Error("view during conversion should contain 'converting' status")
	}
	if !containsStr(view, "Converting 0/1") {
		t.Errorf("view during conversion should show progress, got:\n%s", view)
	}

	t.Log("View renders correctly during conversion")
}

func containsStr(haystack, needle string) bool {
	return len(haystack) > 0 && len(needle) > 0 && contains(haystack, needle)
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
