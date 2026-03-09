package tui

import (
	"fmt"
	"strings"
	"time"

	"charm.land/lipgloss/v2"

	"github.com/noauf/transmute-cli/internal/detect"
	"github.com/noauf/transmute-cli/internal/theme"
)

// Fixed column widths (matching the web simulation layout).
const (
	colCursor = 3  // "> " or "  "
	colCheck  = 3  // "● " or "○ "
	colSize   = 10 // right-aligned file size
	colFormat = 14 // "< webp >" centered
	colStatus = 14 // "idle" / "converting..." / "done"
	colGap    = 2  // gap between columns
)

// nameWidth calculates the flexible Name column width.
func nameWidth(termW int) int {
	fixed := colCursor + colCheck + colSize + colFormat + colStatus + colGap*3
	w := termW - fixed
	if w < 20 {
		w = 20
	}
	return w
}

// pad is a shortcut that pads a line to full width with cream background.
func (m Model) pad(line string) string {
	return theme.PadLine(line, m.width)
}

// padWarm pads a line to full width with the warm (highlighted) background.
func (m Model) padWarm(line string) string {
	return theme.PadLineWithBg(line, m.width, theme.Warm)
}

// blank returns a full-width blank line with cream background.
func (m Model) blank() string {
	return theme.PadLine("", m.width)
}

// View renders the entire TUI, filling the full terminal.
func (m Model) View() string {
	if m.width == 0 || m.height == 0 {
		return "Loading..."
	}

	// We build an array of pre-padded lines (each already full-width with bg).
	var lines []string

	// Title bar (1 line)
	lines = append(lines, m.pad(m.renderTitleBar()))

	// Divider (1 line)
	lines = append(lines, m.pad(m.renderDivider()))

	// State-specific content
	var bottomLines []string // lines that go at the very bottom

	switch m.state {
	case stateFileList:
		// Column header
		lines = append(lines, m.pad(m.renderColumnHeader()))

		// File rows
		fileLines := m.renderFileRows()
		lines = append(lines, fileLines...)

		// Bottom section: divider + bottom bar (pinned to bottom)
		bottomLines = append(bottomLines, m.pad(m.renderDivider()))
		bottomLines = append(bottomLines, m.pad(m.renderBottomBar()))

	case stateConverting:
		for _, l := range strings.Split(m.renderConverting(), "\n") {
			lines = append(lines, m.pad(l))
		}

	case stateResults:
		for _, l := range strings.Split(m.renderResults(), "\n") {
			lines = append(lines, m.pad(l))
		}
		bottomLines = append(bottomLines, m.pad(m.renderDivider()))
		bottomLines = append(bottomLines, m.pad(m.renderResultsFooter()))
	}

	// Help overlay (if visible, goes right after content)
	if m.showHelp {
		for _, l := range strings.Split(m.renderHelp(), "\n") {
			lines = append(lines, m.pad(l))
		}
	}

	// Calculate how many blank lines we need between content and bottom bar
	totalUsed := len(lines) + len(bottomLines)
	remaining := m.height - totalUsed
	if remaining > 0 {
		for i := 0; i < remaining; i++ {
			lines = append(lines, m.blank())
		}
	}

	// Append bottom bar lines
	lines = append(lines, bottomLines...)

	// Truncate if somehow we exceed terminal height
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
	info := theme.Breadcrumb.Render(fmt.Sprintf("  %s \u00B7 %d selected", fileCount, selected))

	left := "  " + title + info
	rightContent := theme.Help.Render("? help") + "  "
	gap := m.width - lipgloss.Width(left) - lipgloss.Width(rightContent)
	if gap < 1 {
		gap = 1
	}

	return left + strings.Repeat(" ", gap) + rightContent
}

// ─── Divider ─────────────────────────────────────────────────

func (m Model) renderDivider() string {
	w := m.width - 4 // 2 char padding each side
	if w < 10 {
		w = 10
	}
	return "  " + theme.Divider.Render(strings.Repeat("\u2500", w)) + "  "
}

// ─── Column header ───────────────────────────────────────────

func (m Model) renderColumnHeader() string {
	nw := nameWidth(m.width)

	nameHdr := theme.Breadcrumb.Copy().Width(colCursor + colCheck + nw).Render(
		strings.Repeat(" ", colCursor+colCheck) + "Name")
	sizeHdr := theme.Breadcrumb.Copy().Width(colSize).Align(lipgloss.Right).Render("Size")
	fmtHdr := theme.Breadcrumb.Copy().Width(colFormat).Align(lipgloss.Center).Render("Convert to")
	statHdr := theme.Breadcrumb.Copy().Width(colStatus).Align(lipgloss.Center).Render("Status")

	return nameHdr + "  " + sizeHdr + "  " + fmtHdr + "  " + statHdr
}

// ─── File rows ───────────────────────────────────────────────

// renderFileRows returns already-padded lines for the file list area.
func (m Model) renderFileRows() []string {
	if len(m.files) == 0 {
		empty := lipgloss.NewStyle().
			Foreground(theme.Light).
			Italic(true).
			Render("    No supported files found. Pass file paths or glob patterns as arguments.")
		return []string{m.blank(), m.pad(empty), m.blank()}
	}

	maxVisible := m.maxVisibleFiles()
	end := m.scroll + maxVisible
	if end > len(m.files) {
		end = len(m.files)
	}

	var rows []string
	for i := m.scroll; i < end; i++ {
		row := m.renderFileRow(i)
		isCursor := i == m.cursor
		if isCursor {
			rows = append(rows, m.padWarm(row))
		} else {
			rows = append(rows, m.pad(row))
		}
	}

	// Scrollbar indicator (if needed)
	if len(m.files) > maxVisible {
		scrollInfo := theme.Help.Render(fmt.Sprintf(
			"  showing %d\u2013%d of %d", m.scroll+1, end, len(m.files)))
		rows = append(rows, m.pad(scrollInfo))
	}

	return rows
}

func (m Model) renderFileRow(idx int) string {
	f := m.files[idx]
	isCursor := idx == m.cursor
	nw := nameWidth(m.width)

	// ── Cursor indicator ──
	cursor := "   "
	if isCursor {
		cursor = " " + theme.Selected.Render(">") + " "
	}

	// ── Selection dot ──
	check := theme.Breadcrumb.Render("\u25CB") + " " // ○
	if f.selected {
		check = theme.StatusDone.Render("\u25CF") + " " // ●  (mint)
	}

	// ── Icon + ext badge + filename ──
	icon := detect.CategoryIcon(f.category)
	catColor := theme.CategoryColor(string(f.category))
	extBadge := theme.ExtBadge(catColor).Render(strings.ToUpper(f.ext))

	nameText := f.name
	maxName := nw - 10
	if maxName < 8 {
		maxName = 8
	}
	if len(nameText) > maxName {
		nameText = nameText[:maxName-3] + "..."
	}

	var nameStyle lipgloss.Style
	if isCursor {
		nameStyle = theme.FileName.Copy().Bold(true)
	} else {
		nameStyle = theme.FileName
	}

	nameContent := icon + " " + extBadge + " " + nameStyle.Render(nameText)
	nameCell := lipgloss.NewStyle().Width(nw).MaxWidth(nw).Render(nameContent)

	// ── Size ──
	sizeCell := theme.FileSize.Copy().Width(colSize).Align(lipgloss.Right).Render(formatSize(f.size))

	// ── Format selector ──
	fmtStr := renderFormatSelector(f, isCursor)
	fmtCell := lipgloss.NewStyle().Width(colFormat).Align(lipgloss.Center).Render(fmtStr)

	// ── Status ──
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
	statusCell := lipgloss.NewStyle().Width(colStatus).Align(lipgloss.Center).Render(statusStr)

	return cursor + check + nameCell + "  " + sizeCell + "  " + fmtCell + "  " + statusCell
}

func renderFormatSelector(f fileEntry, active bool) string {
	if len(f.formats) == 0 {
		return theme.Help.Render("\u2014")
	}

	left := "  "
	right := "  "
	if active && f.formatIdx > 0 {
		left = theme.Help.Render("< ")
	}
	if active && f.formatIdx < len(f.formats)-1 {
		right = theme.Help.Render(" >")
	}

	var middle string
	if active {
		middle = theme.Selected.Render(f.targetFormat)
	} else {
		middle = theme.Unselected.Render(f.targetFormat)
	}

	return left + middle + right
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
		left = "  " + theme.ButtonPrimary.Render(fmt.Sprintf(" Convert %d files [c] ", selected))
	} else {
		left = "  " + theme.Help.Render("Select files to convert")
	}

	right := theme.Help.Render("up/down navigate  left/right format  space select  a all  q quit") + "  "

	gap := m.width - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}

	return left + strings.Repeat(" ", gap) + right
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
		theme.ProgressFilled.Render(strings.Repeat("\u2588", filled)) +
		theme.ProgressEmpty.Render(strings.Repeat("\u2591", barWidth-filled))

	// Show current files being converted
	var current []string
	for _, f := range m.files {
		if f.status == "converting" {
			current = append(current, fmt.Sprintf("  %s \u2192 %s", f.name, f.targetFormat))
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
			rows = append(rows, theme.StatusDone.Render("  \u2713 ")+
				theme.FileName.Render(f.name)+
				theme.Help.Render(" \u2192 ")+
				theme.BreadcrumbActive.Render(f.outputPath))
		case "error":
			rows = append(rows, theme.StatusError.Render("  \u2717 ")+
				theme.FileName.Render(f.name)+
				theme.Help.Render(" \u2014 ")+
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
