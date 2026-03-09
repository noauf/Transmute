package tui

import (
	"fmt"
	"strings"
	"time"

	"charm.land/lipgloss/v2"

	"github.com/noauf/transmute-cli/internal/detect"
	"github.com/noauf/transmute-cli/internal/theme"
)

// View renders the entire TUI, filling the full terminal.
func (m Model) View() string {
	if m.width == 0 || m.height == 0 {
		return "Loading..."
	}

	var sections []string

	sections = append(sections, m.renderTitleBar())
	sections = append(sections, m.renderDivider())

	switch m.state {
	case stateFileList:
		sections = append(sections, m.renderFileList())
		sections = append(sections, m.renderDivider())
		sections = append(sections, m.renderBottomBar())
	case stateConverting:
		sections = append(sections, m.renderConverting())
	case stateResults:
		sections = append(sections, m.renderResults())
		sections = append(sections, m.renderDivider())
		sections = append(sections, m.renderResultsFooter())
	}

	if m.showHelp {
		sections = append(sections, m.renderHelp())
	}

	content := lipgloss.JoinVertical(lipgloss.Left, sections...)

	// Split into individual lines and pad each to full width with background
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		lines[i] = theme.PadLine(line, m.width)
	}

	// Fill remaining vertical space with background-colored blank lines
	remaining := m.height - len(lines)
	if remaining > 0 {
		fill := theme.FillBlankLines(remaining, m.width)
		return strings.Join(lines, "\n") + "\n" + fill
	}

	// Truncate if content exceeds terminal height
	if len(lines) > m.height {
		lines = lines[:m.height]
	}

	return strings.Join(lines, "\n")
}

// ─── Title bar ───────────────────────────────────────────────

func (m Model) renderTitleBar() string {
	title := theme.Logo.Render("transmute")

	fileCount := fmt.Sprintf("%d files", len(m.files))
	selected := 0
	for _, f := range m.files {
		if f.selected {
			selected++
		}
	}
	info := theme.Breadcrumb.Render(fmt.Sprintf("  %s · %d selected", fileCount, selected))

	left := title + info
	padding := ""
	rightContent := theme.Help.Render("? help")
	totalWidth := lipgloss.Width(left) + lipgloss.Width(rightContent) + 2
	if m.width > totalWidth {
		padding = strings.Repeat(" ", m.width-totalWidth)
	}

	return left + padding + rightContent
}

// ─── Divider ─────────────────────────────────────────────────

func (m Model) renderDivider() string {
	w := m.width
	if w <= 0 {
		w = 60
	}
	return theme.Divider.Render(strings.Repeat("─", w))
}

// ─── File list ───────────────────────────────────────────────

func (m Model) renderFileList() string {
	if len(m.files) == 0 {
		empty := lipgloss.NewStyle().
			Foreground(theme.Light).
			Italic(true).
			Padding(2, 4).
			Render("No supported files found. Pass file paths or glob patterns as arguments.")
		return empty
	}

	// Column header
	header := renderColumnHeader(m.width)

	maxVisible := m.maxVisibleFiles()
	end := m.scroll + maxVisible
	if end > len(m.files) {
		end = len(m.files)
	}

	var rows []string
	rows = append(rows, header)

	for i := m.scroll; i < end; i++ {
		rows = append(rows, m.renderFileRow(i))
	}

	// Pad with empty rows so the file list always fills the available space
	rendered := len(rows) - 1 // subtract header
	if rendered < maxVisible {
		emptyRow := strings.Repeat(" ", m.width)
		for i := rendered; i < maxVisible; i++ {
			rows = append(rows, emptyRow)
		}
	}

	// Scrollbar indicator
	if len(m.files) > maxVisible {
		scrollInfo := theme.Help.Render(fmt.Sprintf(
			"  showing %d–%d of %d", m.scroll+1, end, len(m.files)))
		rows = append(rows, scrollInfo)
	}

	return lipgloss.JoinVertical(lipgloss.Left, rows...)
}

func renderColumnHeader(width int) string {
	nameW := 30
	sizeW := 10
	formatW := 20
	statusW := 12

	if width > 100 {
		nameW = width - sizeW - formatW - statusW - 12
	}

	name := theme.Breadcrumb.Copy().Width(nameW).Render("  Name")
	size := theme.Breadcrumb.Copy().Width(sizeW).Align(lipgloss.Right).Render("Size")
	format := theme.Breadcrumb.Copy().Width(formatW).Align(lipgloss.Center).Render("Convert to")
	status := theme.Breadcrumb.Copy().Width(statusW).Align(lipgloss.Center).Render("Status")

	return name + size + "  " + format + "  " + status
}

func (m Model) renderFileRow(idx int) string {
	f := m.files[idx]
	isCursor := idx == m.cursor

	nameW := 30
	sizeW := 10
	formatW := 20
	statusW := 12

	if m.width > 100 {
		nameW = m.width - sizeW - formatW - statusW - 12
	}

	// Cursor + selection indicator
	prefix := "  "
	if isCursor {
		prefix = theme.Selected.Render("> ")
	}

	// Checkbox
	check := "○"
	if f.selected {
		check = theme.StatusDone.Render("●")
	}

	// Category icon + file name
	catColor := theme.CategoryColor(string(f.category))
	icon := detect.CategoryIcon(f.category)
	nameText := f.name
	if len(nameText) > nameW-8 {
		nameText = nameText[:nameW-11] + "..."
	}

	var nameStyle lipgloss.Style
	if isCursor {
		nameStyle = theme.FileName.Copy().Bold(true)
	} else {
		nameStyle = theme.FileName
	}

	nameCol := lipgloss.NewStyle().Width(nameW).Render(
		prefix + check + " " + icon + " " + theme.ExtBadge(catColor).Render(strings.ToUpper(f.ext)) + " " + nameStyle.Render(nameText))

	// Size
	sizeCol := theme.FileSize.Copy().Width(sizeW).Align(lipgloss.Right).Render(formatSize(f.size))

	// Format selector
	formatStr := renderFormatSelector(f, isCursor)
	formatCol := lipgloss.NewStyle().Width(formatW).Align(lipgloss.Center).Render(formatStr)

	// Status
	var statusStr string
	switch f.status {
	case "idle":
		statusStr = theme.StatusIdle.Render("idle")
	case "converting":
		statusStr = theme.StatusConverting.Render("converting...")
	case "done":
		statusStr = theme.StatusDone.Render("done")
	case "error":
		statusStr = theme.StatusError.Render("error")
	}
	statusCol := lipgloss.NewStyle().Width(statusW).Align(lipgloss.Center).Render(statusStr)

	return nameCol + sizeCol + "  " + formatCol + "  " + statusCol
}

func renderFormatSelector(f fileEntry, active bool) string {
	if len(f.formats) == 0 {
		return theme.Help.Render("—")
	}

	var parts []string
	if active && f.formatIdx > 0 {
		parts = append(parts, theme.Help.Render("< "))
	} else {
		parts = append(parts, "  ")
	}

	if active {
		parts = append(parts, theme.Selected.Render(f.targetFormat))
	} else {
		parts = append(parts, theme.Unselected.Render(f.targetFormat))
	}

	if active && f.formatIdx < len(f.formats)-1 {
		parts = append(parts, theme.Help.Render(" >"))
	} else {
		parts = append(parts, "  ")
	}

	return strings.Join(parts, "")
}

// ─── Bottom bar ──────────────────────────────────────────────

func (m Model) renderBottomBar() string {
	selected := 0
	for _, f := range m.files {
		if f.selected {
			selected++
		}
	}

	var left string
	if selected > 0 {
		left = theme.ButtonPrimary.Render(fmt.Sprintf(" Convert %d files [c] ", selected))
	} else {
		left = theme.Help.Render("Select files to convert")
	}

	right := theme.Help.Render("up/down navigate  left/right format  space select  a all  d remove  q quit")

	padding := ""
	totalWidth := lipgloss.Width(left) + lipgloss.Width(right)
	if m.width > totalWidth {
		padding = strings.Repeat(" ", m.width-totalWidth)
	}

	return left + padding + right
}

// ─── Converting view ─────────────────────────────────────────

func (m Model) renderConverting() string {
	elapsed := time.Since(m.startTime).Round(time.Millisecond)

	header := theme.StatusConverting.Render(fmt.Sprintf(
		"  Converting... %d/%d  (%s)", m.converted, m.totalToConv, elapsed))

	// Progress bar
	barWidth := m.width - 8
	if barWidth < 20 {
		barWidth = 20
	}
	progress := float64(m.converted) / float64(m.totalToConv)
	filled := int(progress * float64(barWidth))
	if filled > barWidth {
		filled = barWidth
	}

	bar := "  " +
		theme.ProgressFilled.Render(strings.Repeat("█", filled)) +
		theme.ProgressEmpty.Render(strings.Repeat("░", barWidth-filled))

	// Show current files being converted
	var current []string
	for _, f := range m.files {
		if f.status == "converting" {
			current = append(current, fmt.Sprintf("  %s -> %s", f.name, f.targetFormat))
		}
	}
	currentStr := theme.Help.Render(strings.Join(current, "\n"))

	return lipgloss.JoinVertical(lipgloss.Left,
		"",
		header,
		bar,
		"",
		currentStr,
		"",
		theme.Help.Render("  Press q to cancel"),
	)
}

// ─── Results view ────────────────────────────────────────────

func (m Model) renderResults() string {
	var rows []string

	successCount := 0
	errorCount := 0
	for _, f := range m.files {
		if !f.selected {
			continue
		}
		if f.status == "done" {
			successCount++
		} else if f.status == "error" {
			errorCount++
		}
	}

	elapsed := time.Since(m.startTime).Round(time.Millisecond)
	summary := theme.StatusDone.Render(fmt.Sprintf(
		"  Conversion complete! %d succeeded", successCount))
	if errorCount > 0 {
		summary += theme.StatusError.Render(fmt.Sprintf(", %d failed", errorCount))
	}
	summary += theme.Help.Render(fmt.Sprintf("  (%s)", elapsed))

	rows = append(rows, "", summary, "")

	// List results
	for _, f := range m.files {
		if !f.selected {
			continue
		}
		switch f.status {
		case "done":
			rows = append(rows, theme.StatusDone.Render("  done ")+
				theme.FileName.Render(f.name)+
				theme.Help.Render(" -> ")+
				theme.BreadcrumbActive.Render(f.outputPath))
		case "error":
			rows = append(rows, theme.StatusError.Render("  fail ")+
				theme.FileName.Render(f.name)+
				theme.Help.Render(" -- ")+
				theme.StatusError.Render(f.error))
		}
	}

	return lipgloss.JoinVertical(lipgloss.Left, rows...)
}

func (m Model) renderResultsFooter() string {
	return theme.Help.Render("  Press enter to exit  |  esc to convert more")
}

// ─── Help overlay ────────────────────────────────────────────

func (m Model) renderHelp() string {
	keys := []struct {
		key  string
		desc string
	}{
		{"up/down, j/k", "Navigate files"},
		{"left/right, h/l", "Change target format"},
		{"space", "Toggle file selection"},
		{"a", "Select / deselect all"},
		{"d", "Remove file from list"},
		{"c or enter", "Start conversion"},
		{"esc", "Go back"},
		{"q or ctrl+c", "Quit"},
	}

	var lines []string
	lines = append(lines, "")
	lines = append(lines, theme.BreadcrumbActive.Render("  Keyboard Shortcuts"))
	lines = append(lines, "")

	for _, k := range keys {
		lines = append(lines, fmt.Sprintf("  %s  %s",
			theme.Selected.Copy().Width(18).Render(k.key),
			theme.Help.Render(k.desc)))
	}
	lines = append(lines, "")

	return lipgloss.JoinVertical(lipgloss.Left, lines...)
}
