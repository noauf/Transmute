package theme

import (
	"image/color"
	"strings"

	"charm.land/lipgloss/v2"
)

// ─── Pastel palette (matching the web app) ───────────────────

var (
	Pink   = lipgloss.Color("#f472b6")
	Purple = lipgloss.Color("#a78bfa")
	Blue   = lipgloss.Color("#60a5fa")
	Mint   = lipgloss.Color("#34d399")
	Orange = lipgloss.Color("#fb923c")
	Teal   = lipgloss.Color("#2dd4bf")

	Cream = lipgloss.Color("#fdf6ef")
	Warm  = lipgloss.Color("#f8f0e6")
	Peach = lipgloss.Color("#fce8d5")

	Dark  = lipgloss.Color("#2d1f14")
	Mid   = lipgloss.Color("#8b7355")
	Light = lipgloss.Color("#bfa98a")

	Red      = lipgloss.Color("#f43f5e")
	DimBg    = lipgloss.Color("#f6f6f6")
	BorderCl = lipgloss.Color("#e8e0d4")

	// Full-screen background
	ScreenBg = lipgloss.Color("#fdf6ef") // Cream — matches the web app
)

// ─── Category colors ─────────────────────────────────────────

func CategoryColor(cat string) color.Color {
	switch cat {
	case "image":
		return Pink
	case "document":
		return Blue
	case "audio":
		return Purple
	case "video":
		return Orange
	case "data":
		return Mint
	case "font":
		return Teal
	case "spreadsheet":
		return Mint
	default:
		return Light
	}
}

// ─── Reusable styles ─────────────────────────────────────────
//
// IMPORTANT: Every style MUST have Background(ScreenBg) so the cream
// background propagates through all ANSI sequences. Wrapping
// already-styled text with a background style does NOT work because
// inner escape sequences reset the background.

var (
	// Title bar
	TitleBar = lipgloss.NewStyle().
			Bold(true).
			Foreground(Dark).
			Background(ScreenBg).
			Padding(0, 2)

	// Header / breadcrumb
	Breadcrumb = lipgloss.NewStyle().
			Foreground(Mid).
			Background(ScreenBg).
			Bold(false)

	BreadcrumbActive = lipgloss.NewStyle().
				Foreground(Dark).
				Background(ScreenBg).
				Bold(true)

	// File row
	FileName = lipgloss.NewStyle().
			Foreground(Dark).
			Background(ScreenBg).
			Bold(true)

	FileSize = lipgloss.NewStyle().
			Foreground(Light).
			Background(ScreenBg)

	ExtBadge = func(c color.Color) lipgloss.Style {
		return lipgloss.NewStyle().
			Foreground(c).
			Background(ScreenBg).
			Bold(true)
	}

	// Status indicators
	StatusIdle = lipgloss.NewStyle().
			Foreground(Light).
			Background(ScreenBg).
			Italic(true)

	StatusConverting = lipgloss.NewStyle().
				Foreground(Pink).
				Background(ScreenBg).
				Bold(true)

	StatusDone = lipgloss.NewStyle().
			Foreground(Mint).
			Background(ScreenBg).
			Bold(true)

	StatusError = lipgloss.NewStyle().
			Foreground(Red).
			Background(ScreenBg).
			Bold(true)

	// Buttons / actions (these keep their own bg colors)
	ButtonPrimary = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#ffffff")).
			Background(Pink).
			Bold(true).
			Padding(0, 2)

	ButtonSecondary = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#ffffff")).
			Background(Mint).
			Bold(true).
			Padding(0, 2)

	// Progress bar
	ProgressFilled = lipgloss.NewStyle().
			Foreground(Pink).
			Background(ScreenBg)

	ProgressEmpty = lipgloss.NewStyle().
			Foreground(BorderCl).
			Background(ScreenBg)

	// Help / footer
	Help = lipgloss.NewStyle().
		Foreground(Light).
		Background(ScreenBg).
		Italic(true)

	// Cursor / selection
	Selected = lipgloss.NewStyle().
			Bold(true).
			Foreground(Pink).
			Background(ScreenBg)

	Unselected = lipgloss.NewStyle().
			Foreground(Dark).
			Background(ScreenBg)

	// Divider
	Divider = lipgloss.NewStyle().
		Foreground(BorderCl).
		Background(ScreenBg)

	// Logo / branding
	Logo = lipgloss.NewStyle().
		Foreground(Pink).
		Background(ScreenBg).
		Bold(true)
)

// BgStyle returns a plain style with just the cream background, useful
// for spacing characters that need to carry the background color.
var BgStyle = lipgloss.NewStyle().Background(ScreenBg)

// WarmBgStyle returns a plain style with the warm highlight background.
var WarmBgStyle = lipgloss.NewStyle().Background(Warm)

// PadLine pads a single rendered line to the full terminal width with
// cream background spaces on the right edge.
func PadLine(line string, width int) string {
	w := lipgloss.Width(line)
	if w >= width {
		return line
	}
	pad := BgStyle.Render(strings.Repeat(" ", width-w))
	return line + pad
}

// PadLineWithBg pads a line to full width with a specific background color.
func PadLineWithBg(line string, width int, bg color.Color) string {
	w := lipgloss.Width(line)
	if w >= width {
		return line
	}
	pad := lipgloss.NewStyle().Background(bg).Render(strings.Repeat(" ", width-w))
	return line + pad
}

// FillBlankLines returns n blank lines fully painted with the screen
// background color at the given width.
func FillBlankLines(n, width int) string {
	if n <= 0 {
		return ""
	}
	blankLine := BgStyle.Render(strings.Repeat(" ", width))
	lines := make([]string, n)
	for i := range lines {
		lines[i] = blankLine
	}
	return strings.Join(lines, "\n")
}
