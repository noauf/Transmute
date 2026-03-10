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
	if !m.files[0].selected {
		t.Fatal("expected file to be selected by default")
	}

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

	if m.state != stateResults {
		t.Fatalf("expected stateResults after all conversions done, got %d", m.state)
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

	// Test 'esc' to go back to file list
	newModel, _ = m.Update(tea.KeyMsg{Type: tea.KeyEscape})
	m = newModel.(Model)

	if m.state != stateFileList {
		t.Fatalf("expected stateFileList after esc, got %d", m.state)
	}
	if m.files[0].status != "idle" {
		t.Fatalf("expected status reset to 'idle' after esc, got '%s'", m.files[0].status)
	}

	t.Log("State machine verified: idle -> converting -> done -> idle (via esc)")
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

	// Convert the file
	newModel, cmd := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'c'}})
	m = newModel.(Model)
	msg := cmd()
	newModel, _ = m.Update(msg)
	m = newModel.(Model)

	if m.state != stateResults {
		t.Fatalf("expected stateResults, got %d", m.state)
	}
	if m.files[0].status != "done" {
		t.Fatalf("expected done, got %s", m.files[0].status)
	}

	outputPath := m.files[0].outputPath
	if _, err := os.Stat(outputPath); err != nil {
		t.Fatalf("output file should exist: %v", err)
	}

	// Press 'x' to delete the output
	newModel, _ = m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'x'}})
	m = newModel.(Model)

	if m.files[0].status != "deleted" {
		t.Fatalf("expected 'deleted' status after pressing x, got '%s'", m.files[0].status)
	}
	if m.files[0].outputPath != "" {
		t.Fatal("outputPath should be cleared after delete")
	}
	if _, err := os.Stat(outputPath); err == nil {
		t.Fatal("output file should have been deleted from disk")
	}

	t.Log("Delete output works: file removed from disk, status set to 'deleted'")
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
	if !containsStr(view, "Convert 1 files") {
		t.Error("initial view should contain convert button")
	}

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
