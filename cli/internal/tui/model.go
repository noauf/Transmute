package tui

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/key"
	tea "github.com/charmbracelet/bubbletea"

	"github.com/noauf/transmute-cli/internal/converter"
	"github.com/noauf/transmute-cli/internal/detect"
)

// ─── State machine ───────────────────────────────────────────

type state int

const (
	stateFileList state = iota // Browsing/selecting files (also used during conversion)
)

// ─── File entry ──────────────────────────────────────────────

type fileEntry struct {
	path         string
	name         string
	ext          string
	size         int64
	category     detect.FileCategory
	selected     bool
	targetFormat string
	formats      []string
	formatIdx    int
	status       string // "idle", "converting", "done", "error", "deleted"
	error        string
	outputPath   string
}

// ─── Messages ────────────────────────────────────────────────

type conversionDoneMsg struct {
	index  int
	result converter.Result
}

type conversionStartMsg struct {
	index int
}

type tickMsg time.Time

// ─── Model ───────────────────────────────────────────────────

type Model struct {
	files     []fileEntry
	cursor    int
	state     state
	keys      KeyMap
	width     int
	height    int
	outputDir string
	showHelp  bool
	scroll    int // scroll offset for file list

	// Progress tracking
	converting  int
	converted   int
	totalToConv int
	startTime   time.Time
}

// New creates a new TUI model from a list of file paths and an output directory.
func New(paths []string, outputDir string) Model {
	var files []fileEntry

	for _, p := range paths {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		if info.IsDir() {
			// Expand directory
			dirFiles := expandDir(p)
			files = append(files, dirFiles...)
		} else {
			entry := makeFileEntry(p, info)
			if entry != nil {
				files = append(files, *entry)
			}
		}
	}

	return Model{
		files:     files,
		cursor:    0,
		state:     stateFileList,
		keys:      DefaultKeyMap(),
		showHelp:  false,
		outputDir: outputDir,
	}
}

func expandDir(dir string) []fileEntry {
	var files []fileEntry
	entries, err := os.ReadDir(dir)
	if err != nil {
		return files
	}
	for _, e := range entries {
		if e.IsDir() || strings.HasPrefix(e.Name(), ".") {
			continue
		}
		p := filepath.Join(dir, e.Name())
		info, err := e.Info()
		if err != nil {
			continue
		}
		entry := makeFileEntry(p, info)
		if entry != nil {
			files = append(files, *entry)
		}
	}
	return files
}

func makeFileEntry(path string, info os.FileInfo) *fileEntry {
	ext := strings.TrimPrefix(filepath.Ext(path), ".")
	ext = strings.ToLower(ext)

	if !detect.IsSupported(ext) {
		return nil
	}

	formats := detect.GetAvailableFormats(ext)
	if len(formats) == 0 {
		return nil
	}

	// Use the smart default target (matches web app defaults)
	defaultTarget := detect.GetDefaultTarget(ext)
	defaultIdx := 0
	for i, f := range formats {
		if f == defaultTarget {
			defaultIdx = i
			break
		}
	}

	return &fileEntry{
		path:         path,
		name:         info.Name(),
		ext:          ext,
		size:         info.Size(),
		category:     detect.DetectCategory(ext),
		selected:     false, // Don't select by default
		targetFormat: defaultTarget,
		formats:      formats,
		formatIdx:    defaultIdx,
		status:       "idle",
	}
}

// ─── Init ────────────────────────────────────────────────────

func (m Model) Init() tea.Cmd {
	return nil
}

// ─── Update ──────────────────────────────────────────────────

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case conversionDoneMsg:
		if msg.index >= 0 && msg.index < len(m.files) {
			if msg.result.Err != nil {
				m.files[msg.index].status = "error"
				m.files[msg.index].error = msg.result.Err.Error()
			} else {
				m.files[msg.index].status = "done"
				m.files[msg.index].outputPath = msg.result.OutputPath
			}
			m.converted++
		}

		// Start next conversion if there are more files
		m, cmd := m.convertNext()
		return m, cmd

	case tea.KeyMsg:
		return m.handleKey(msg)
	}

	return m, nil
}

func (m Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	return m.handleFileListKey(msg)
}

func (m Model) handleFileListKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	isConverting := m.totalToConv > 0 && m.converted < m.totalToConv

	switch {
	case key.Matches(msg, m.keys.Quit):
		return m, tea.Quit

	case key.Matches(msg, m.keys.Up):
		if m.cursor > 0 {
			m.cursor--
			m.ensureVisible()
		}

	case key.Matches(msg, m.keys.Down):
		if m.cursor < len(m.files)-1 {
			m.cursor++
			m.ensureVisible()
		}

	case key.Matches(msg, m.keys.Help):
		m.showHelp = !m.showHelp

	// Everything below is blocked while converting
	case key.Matches(msg, m.keys.Space):
		if !isConverting && len(m.files) > 0 {
			m.files[m.cursor].selected = !m.files[m.cursor].selected
		}

	case key.Matches(msg, m.keys.Left):
		if !isConverting && len(m.files) > 0 {
			f := &m.files[m.cursor]
			if f.formatIdx > 0 {
				f.formatIdx--
				f.targetFormat = f.formats[f.formatIdx]
			}
		}

	case key.Matches(msg, m.keys.Right), key.Matches(msg, m.keys.Tab):
		if !isConverting && len(m.files) > 0 {
			f := &m.files[m.cursor]
			if f.formatIdx < len(f.formats)-1 {
				f.formatIdx++
				f.targetFormat = f.formats[f.formatIdx]
			}
		}

	case key.Matches(msg, m.keys.SelectAll):
		if !isConverting {
			allSelected := true
			for _, f := range m.files {
				if !f.selected {
					allSelected = false
					break
				}
			}
			for i := range m.files {
				m.files[i].selected = !allSelected
			}
		}

	case key.Matches(msg, m.keys.Delete):
		if !isConverting && len(m.files) > 0 {
			m.files = append(m.files[:m.cursor], m.files[m.cursor+1:]...)
			if m.cursor >= len(m.files) && m.cursor > 0 {
				m.cursor--
			}
		}

	case key.Matches(msg, m.keys.Convert), key.Matches(msg, m.keys.Enter):
		if !isConverting {
			return m.startConversion()
		}

	case key.Matches(msg, m.keys.Preview):
		if len(m.files) > 0 {
			f := m.files[m.cursor]
			// Open output if done, otherwise input
			path := f.path
			if f.status == "done" && f.outputPath != "" {
				path = f.outputPath
			}
			openFile(path)
		}

	case key.Matches(msg, m.keys.DeleteOutput):
		// Delete the converted output file from disk
		if len(m.files) > 0 && !isConverting {
			f := &m.files[m.cursor]
			if f.status == "done" && f.outputPath != "" {
				if err := os.Remove(f.outputPath); err == nil {
					f.status = "idle"
					f.outputPath = ""
				}
			}
		}

	case key.Matches(msg, m.keys.Back):
		// Reset done/error files to idle for reconversion
		if len(m.files) > 0 && !isConverting {
			f := &m.files[m.cursor]
			if f.status == "done" || f.status == "error" || f.status == "deleted" {
				f.status = "idle"
				f.error = ""
				f.outputPath = ""
			}
		}
	}

	return m, nil
}

// ─── Conversion logic ────────────────────────────────────────

func (m Model) startConversion() (Model, tea.Cmd) {
	// Count selected files
	count := 0
	for _, f := range m.files {
		if f.selected {
			count++
		}
	}
	if count == 0 {
		return m, nil
	}

	// Stay on stateFileList — status column updates inline
	m.totalToConv = count
	m.converted = 0
	m.converting = 0
	m.startTime = time.Now()

	m, cmd := m.convertNext()
	return m, cmd
}

func (m Model) convertNext() (Model, tea.Cmd) {
	// Find next file to convert
	for i := range m.files {
		if m.files[i].selected && m.files[i].status == "idle" {
			m.files[i].status = "converting"
			idx := i
			path := m.files[i].path
			target := m.files[i].targetFormat
			outDir := m.outputDir

			return m, func() tea.Msg {
				result := converter.Convert(path, target, outDir)
				return conversionDoneMsg{index: idx, result: result}
			}
		}
	}
	return m, nil
}

func (m *Model) ensureVisible() {
	maxVisible := m.maxVisibleFiles()
	if m.cursor < m.scroll {
		m.scroll = m.cursor
	}
	if m.cursor >= m.scroll+maxVisible {
		m.scroll = m.cursor - maxVisible + 1
	}
}

func (m Model) maxVisibleFiles() int {
	available := m.height - 12 // Reserve space for header, footer, borders
	if available < 3 {
		return 3
	}
	return available
}

// ─── Helpers ─────────────────────────────────────────────────

// openFile opens a file with the system default viewer.
func openFile(path string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", path)
	case "linux":
		cmd = exec.Command("xdg-open", path)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", path)
	default:
		return
	}
	cmd.Start() //nolint:errcheck
}

func formatSize(bytes int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
	)
	switch {
	case bytes >= GB:
		return fmt.Sprintf("%.1f GB", float64(bytes)/float64(GB))
	case bytes >= MB:
		return fmt.Sprintf("%.1f MB", float64(bytes)/float64(MB))
	case bytes >= KB:
		return fmt.Sprintf("%.1f KB", float64(bytes)/float64(KB))
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}
