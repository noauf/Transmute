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
		sections = append(sections, m.renderColumnHeader())
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

	// "Name" sits after the cursor+check prefix (6 chars), indented
	nameHdr := theme.Breadcrumb.Copy().Width(colCursor + colCheck + nw).Render(
		strings.Repeat(" ", colCursor+colCheck) + "Name")
	sizeHdr := theme.Breadcrumb.Copy().Width(colSize).Align(lipgloss.Right).Render("Size")
	fmtHdr := theme.Breadcrumb.Copy().Width(colFormat).Align(lipgloss.Center).Render("Convert to")
	statHdr := theme.Breadcrumb.Copy().Width(colStatus).Align(lipgloss.Center).Render("Status")

	return nameHdr + "  " + sizeHdr + "  " + fmtHdr + "  " + statHdr
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

	maxVisible := m.maxVisibleFiles()
	end := m.scroll + maxVisible
	if end > len(m.files) {
		end = len(m.files)
	}

	var rows []string
	for i := m.scroll; i < end; i++ {
		rows = append(rows, m.renderFileRow(i))
	}

	// Pad with empty rows so the file list always fills the available space
	rendered := len(rows)
	if rendered < maxVisible {
		emptyRow := strings.Repeat(" ", m.width)
		for i := rendered; i < maxVisible; i++ {
			rows = append(rows, emptyRow)
		}
	}

	// Scrollbar indicator
	if len(m.files) > maxVisible {
		scrollInfo := theme.Help.Render(fmt.Sprintf(
			"  showing %d\u2013%d of %d", m.scroll+1, end, len(m.files)))
		rows = append(rows, scrollInfo)
	}

	return lipgloss.JoinVertical(lipgloss.Left, rows...)
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
	// Reserve space for icon(2) + space(1) + ext(max 5) + space(1) + ...
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

	// Build the name cell content, then wrap in a fixed-width style
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

	// ── Assemble row ──
	row := cursor + check + nameCell + "  " + sizeCell + "  " + fmtCell + "  " + statusCell

	// Highlight active row with warm background
	if isCursor {
		row = lipgloss.NewStyle().Background(theme.Warm).Render(row)
	}

	return row
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
