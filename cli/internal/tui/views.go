package tui

import (
	"fmt"
	"strings"
	"time"

	"charm.land/lipgloss/v2"

	"github.com/noauf/transmute-cli/internal/detect"
	"github.com/noauf/transmute-cli/internal/theme"
)

// Fixed column widths for the right-side columns.
const (
	colSize   = 10 // right-aligned file size
	colFormat = 14 // "< webp >" centered
	colStatus = 14 // "idle" / "converting..." / "done"
)

// nameWidth returns the flexible Name column width (everything left of Size).
func nameWidth(termW int) int {
	// prefix(6) + name(flex) + gap(2) + size(10) + gap(2) + fmt(14) + gap(2) + status(14)
	w := termW - 6 - 2 - colSize - 2 - colFormat - 2 - colStatus
	if w < 20 {
		w = 20
	}
	return w
}

// bg wraps a line so it fills the full terminal width with cream bg.
func (m Model) bg(line string) string {
	return lipgloss.Place(m.width, 1, lipgloss.Left, lipgloss.Top, line,
		lipgloss.WithWhitespaceStyle(theme.ScreenStyle))
}

// wbg wraps a line so it fills the full terminal width with warm bg (cursor row).
func (m Model) wbg(line string) string {
	return lipgloss.Place(m.width, 1, lipgloss.Left, lipgloss.Top, line,
		lipgloss.WithWhitespaceStyle(theme.WarmWhitespace))
}

// View renders the full-screen TUI.
func (m Model) View() string {
	if m.width == 0 || m.height == 0 {
		return "Loading..."
	}

	var top []string    // content at the top
	var bottom []string // content pinned to the bottom

	top = append(top, m.bg(m.renderTitleBar()))
	top = append(top, m.bg(m.renderDivider()))

	switch m.state {
	case stateFileList:
		top = append(top, m.bg(""))
		top = append(top, m.bg(m.renderColumnHeader()))
		top = append(top, m.bg(""))
		top = append(top, m.renderFileRows()...) // rows already have bg/wbg applied

		bottom = append(bottom, m.bg(m.renderDivider()))
		bottom = append(bottom, m.bg(m.renderBottomBar()))

	case stateResults:
		top = append(top, m.bg(""))
		top = append(top, m.bg(m.renderColumnHeader()))
		top = append(top, m.bg(""))
		top = append(top, m.renderFileRows()...)

		bottom = append(bottom, m.bg(m.renderDivider()))
		bottom = append(bottom, m.bg(m.renderResultsBar()))
	}

	if m.showHelp {
		for _, line := range strings.Split(m.renderHelp(), "\n") {
			top = append(top, m.bg(line))
		}
	}

	// Assemble: top lines + blank fill + bottom lines
	totalUsed := len(top) + len(bottom)
	fill := m.height - totalUsed
	if fill < 0 {
		fill = 0
	}

	blankLine := m.bg("")

	var all []string
	all = append(all, top...)
	for i := 0; i < fill; i++ {
		all = append(all, blankLine)
	}
	all = append(all, bottom...)

	// Truncate to terminal height
	if len(all) > m.height {
		all = all[:m.height]
	}

	return strings.Join(all, "\n")
}

// ─── Title bar ───────────────────────────────────────────────

func (m Model) renderTitleBar() string {
	title := theme.Bg(theme.Logo).Render("transmute")

	selected := 0
	for _, f := range m.files {
		if f.selected {
			selected++
		}
	}

	var infoText string
	isConverting := m.totalToConv > 0 && m.converted < m.totalToConv
	if isConverting {
		infoText = fmt.Sprintf("  %d files · converting %d/%d", len(m.files), m.converted, m.totalToConv)
	} else if m.state == stateResults {
		infoText = fmt.Sprintf("  %d files · %d converted", len(m.files), m.converted)
	} else {
		infoText = fmt.Sprintf("  %d files · %d selected", len(m.files), selected)
	}
	info := theme.Bg(theme.Breadcrumb).Render(infoText)

	left := theme.BgStr("  ") + title + info
	right := theme.Bg(theme.Help).Render("? help") + theme.BgStr("  ")
	gap := m.width - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	return left + theme.BgStr(strings.Repeat(" ", gap)) + right
}

// ─── Divider ─────────────────────────────────────────────────

func (m Model) renderDivider() string {
	w := m.width - 4
	if w < 10 {
		w = 10
	}
	return theme.BgStr("  ") + theme.Bg(theme.Divider).Render(strings.Repeat("─", w)) + theme.BgStr("  ")
}

// ─── Column header ───────────────────────────────────────────

func (m Model) renderColumnHeader() string {
	nw := nameWidth(m.width)
	prefix := theme.BgStr(strings.Repeat(" ", 6)) // cursor(3) + check(3)

	nameHdr := theme.Bg(theme.Breadcrumb).Copy().Width(nw).Render("Name")
	sizeHdr := theme.Bg(theme.Breadcrumb).Copy().Width(colSize).Align(lipgloss.Right).Render("Size")
	fmtHdr := theme.Bg(theme.Breadcrumb).Copy().Width(colFormat).Align(lipgloss.Center).Render("Convert to")
	statHdr := theme.Bg(theme.Breadcrumb).Copy().Width(colStatus).Align(lipgloss.Center).Render("Status")

	return prefix + nameHdr + theme.BgStr("  ") + sizeHdr + theme.BgStr("  ") + fmtHdr + theme.BgStr("  ") + statHdr
}

// ─── File rows ───────────────────────────────────────────────

func (m Model) renderFileRows() []string {
	if len(m.files) == 0 {
		msg := theme.Bg(theme.Help).Render("  No supported files found. Pass file paths or glob patterns as arguments.")
		return []string{m.bg(""), m.bg(msg), m.bg("")}
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

	if len(m.files) > maxVisible {
		rows = append(rows, m.bg(theme.Bg(theme.Help).Render(fmt.Sprintf(
			"  showing %d–%d of %d", m.scroll+1, end, len(m.files)))))
	}

	return rows
}

func (m Model) renderFileRow(idx int) string {
	f := m.files[idx]
	isCursor := idx == m.cursor
	nw := nameWidth(m.width)

	// Pick background helpers based on cursor state
	bgStr := theme.BgStr
	bgS := theme.Bg
	lineBg := m.bg
	if isCursor {
		bgStr = theme.WBgStr
		bgS = theme.WBg
		lineBg = m.wbg
	}

	// Cursor indicator
	cursor := bgStr("   ")
	if isCursor {
		cursor = bgStr(" ") + bgS(theme.Selected).Render(">") + bgStr(" ")
	}

	// Selection dot
	var check string
	if f.selected {
		check = bgS(theme.StatusDone).Render("●") + bgStr("  ")
	} else {
		check = bgS(theme.Breadcrumb).Render("○") + bgStr("  ")
	}

	// Icon + ext badge + filename
	icon := detect.CategoryIcon(f.category)
	catColor := theme.CategoryColor(string(f.category))
	extBadge := bgS(theme.ExtBadge(catColor)).Render(strings.ToUpper(f.ext))

	nameText := f.name
	maxName := nw - 10
	if maxName < 8 {
		maxName = 8
	}
	if len(nameText) > maxName {
		nameText = nameText[:maxName-3] + "..."
	}

	nameStyle := theme.FileName
	if isCursor {
		nameStyle = nameStyle.Copy().Bold(true)
	}

	nameContent := bgStr(icon+" ") + extBadge + bgStr(" ") + bgS(nameStyle).Render(nameText)
	nameCell := bgS(lipgloss.NewStyle()).Copy().Width(nw).MaxWidth(nw).Render(nameContent)

	// Size
	sizeCell := bgS(theme.FileSize).Copy().Width(colSize).Align(lipgloss.Right).Render(formatSize(f.size))

	// Format selector — hide arrows during conversion/results (keys are blocked)
	isConverting := m.totalToConv > 0 && m.converted < m.totalToConv
	showArrows := isCursor && !isConverting && m.state == stateFileList
	fmtStr := renderFormatSelector(f, showArrows, bgStr, bgS)
	fmtCell := bgS(lipgloss.NewStyle()).Copy().Width(colFormat).Align(lipgloss.Center).Render(fmtStr)

	// Status
	var statusStr string
	switch f.status {
	case "idle":
		statusStr = bgS(theme.StatusIdle).Render("idle")
	case "converting":
		statusStr = bgS(theme.StatusConverting).Render("converting...")
	case "done":
		statusStr = bgS(theme.StatusDone).Render("done")
	case "error":
		statusStr = bgS(theme.StatusError).Render("error")
	}
	statusCell := bgS(lipgloss.NewStyle()).Copy().Width(colStatus).Align(lipgloss.Center).Render(statusStr)

	row := cursor + check + nameCell + bgStr("  ") + sizeCell + bgStr("  ") + fmtCell + bgStr("  ") + statusCell

	return lineBg(row)
}

func renderFormatSelector(f fileEntry, active bool, bgStr func(string) string, bgS func(lipgloss.Style) lipgloss.Style) string {
	if len(f.formats) == 0 {
		return bgS(theme.Help).Render("—")
	}

	left := bgStr("  ")
	right := bgStr("  ")
	if active && f.formatIdx > 0 {
		left = bgS(theme.Help).Render("< ")
	}
	if active && f.formatIdx < len(f.formats)-1 {
		right = bgS(theme.Help).Render(" >")
	}

	var middle string
	if active {
		middle = bgS(theme.Selected).Render(f.targetFormat)
	} else {
		middle = bgS(theme.Unselected).Render(f.targetFormat)
	}

	return left + middle + right
}

// ─── Bottom bar ──────────────────────────────────────────────

func (m Model) renderBottomBar() string {
	isConverting := m.totalToConv > 0 && m.converted < m.totalToConv

	if isConverting {
		// Show progress inline
		elapsed := time.Since(m.startTime).Round(time.Millisecond)
		left := theme.BgStr("  ") +
			theme.Bg(theme.StatusConverting).Render(
				fmt.Sprintf(" Converting %d/%d ", m.converted, m.totalToConv)) +
			theme.Bg(theme.Help).Render(fmt.Sprintf("  %s", elapsed))

		right := theme.Bg(theme.Help).Render("q quit") + theme.BgStr("  ")

		gap := m.width - lipgloss.Width(left) - lipgloss.Width(right)
		if gap < 1 {
			gap = 1
		}
		return left + theme.BgStr(strings.Repeat(" ", gap)) + right
	}

	selected := 0
	for _, f := range m.files {
		if f.selected {
			selected++
		}
	}

	var left string
	if selected > 0 {
		left = theme.BgStr("  ") + theme.ButtonPrimary.Render(fmt.Sprintf(" Convert %d files [c] ", selected))
	} else {
		left = theme.BgStr("  ") + theme.Bg(theme.Help).Render("Select files to convert")
	}

	// Adaptive keybindings: full or compact based on available space
	leftW := lipgloss.Width(left)
	fullHelp := "up/down navigate  left/right format  space select  a all  q quit"
	shortHelp := "↑↓ nav  ←→ fmt  space sel  a all  q quit"

	helpText := fullHelp
	rightW := len(helpText) + 4 // 2 padding each side
	if leftW+rightW > m.width {
		helpText = shortHelp
	}

	right := theme.Bg(theme.Help).Render(helpText) + theme.BgStr("  ")

	gap := m.width - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	return left + theme.BgStr(strings.Repeat(" ", gap)) + right
}

// renderResultsBar shows a summary after all conversions are done.
func (m Model) renderResultsBar() string {
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
	left := theme.BgStr("  ") +
		theme.Bg(theme.StatusDone).Render(fmt.Sprintf(" %d converted ", successCount))
	if errorCount > 0 {
		left += theme.BgStr(" ") + theme.Bg(theme.StatusError).Render(fmt.Sprintf(" %d failed ", errorCount))
	}
	left += theme.Bg(theme.Help).Render(fmt.Sprintf("  %s", elapsed))

	right := theme.Bg(theme.Help).Render("enter quit  esc convert more") + theme.BgStr("  ")

	gap := m.width - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 1 {
		gap = 1
	}
	return left + theme.BgStr(strings.Repeat(" ", gap)) + right
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
	lines = append(lines, theme.Bg(theme.BreadcrumbActive).Render("  Keyboard Shortcuts"))
	lines = append(lines, "")

	for _, k := range keys {
		lines = append(lines, fmt.Sprintf("  %s  %s",
			theme.Bg(theme.Selected).Copy().Width(18).Render(k.key),
			theme.Bg(theme.Help).Render(k.desc)))
	}
	lines = append(lines, "")

	return lipgloss.JoinVertical(lipgloss.Left, lines...)
}
