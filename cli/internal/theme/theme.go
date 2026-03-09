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
			Bold(false)

	BreadcrumbActive = lipgloss.NewStyle().
				Foreground(Dark).
				Bold(true)

	// File row
	FileName = lipgloss.NewStyle().
			Foreground(Dark).
			Bold(true)

	FileSize = lipgloss.NewStyle().
			Foreground(Light)

	ExtBadge = func(c color.Color) lipgloss.Style {
		return lipgloss.NewStyle().
			Foreground(c).
			Bold(true)
	}

	// Status indicators
	StatusIdle = lipgloss.NewStyle().
			Foreground(Light).
			Italic(true)

	StatusConverting = lipgloss.NewStyle().
				Foreground(Pink).
				Bold(true)

	StatusDone = lipgloss.NewStyle().
			Foreground(Mint).
			Bold(true)

	StatusError = lipgloss.NewStyle().
			Foreground(Red).
			Bold(true)

	// Buttons / actions
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
			Foreground(Pink)

	ProgressEmpty = lipgloss.NewStyle().
			Foreground(BorderCl)

	// Help / footer
	Help = lipgloss.NewStyle().
		Foreground(Light).
		Italic(true)

	// Cursor / selection
	Selected = lipgloss.NewStyle().
			Bold(true).
			Foreground(Pink)

	Unselected = lipgloss.NewStyle().
			Foreground(Dark)

	// Divider
	Divider = lipgloss.NewStyle().
		Foreground(BorderCl)

	// Logo / branding
	Logo = lipgloss.NewStyle().
		Foreground(Pink).
		Bold(true)
)

// PadLine pads a single rendered line to the full terminal width and applies
// the cream background behind ALL content (not just the padding). This is
// achieved by placing the line inside a full-width style with Background set.
func PadLine(line string, width int) string {
	return PadLineWithBg(line, width, ScreenBg)
}

// PadLineWithBg pads a line to full width with a specific background color.
func PadLineWithBg(line string, width int, bg color.Color) string {
	w := lipgloss.Width(line)
	if w >= width {
		// Even if the line is already wide enough, wrap with background
		return lipgloss.NewStyle().Background(bg).Render(line)
	}
	pad := strings.Repeat(" ", width-w)
	return lipgloss.NewStyle().Background(bg).Render(line + pad)
}

// FillBlankLines returns n blank lines fully painted with the screen
// background color at the given width.
func FillBlankLines(n, width int) string {
	if n <= 0 {
		return ""
	}
	blankLine := lipgloss.NewStyle().
		Background(ScreenBg).
		Render(strings.Repeat(" ", width))
	lines := make([]string, n)
	for i := range lines {
		lines[i] = blankLine
	}
	return strings.Join(lines, "\n")
}
