package theme

import (
	"image/color"

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
// Styles do NOT set Background — the full-screen Place() call in
// View() paints ALL whitespace with ScreenBg via WithWhitespaceStyle.

var (
	// Header / breadcrumb
	Breadcrumb = lipgloss.NewStyle().
			Foreground(Mid)

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

	// Buttons / actions (these keep their own bg colors)
	ButtonPrimary = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#ffffff")).
			Background(Pink).
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

// ScreenStyle is the whitespace style used by Place().
// It paints trailing/fill space with the cream background.
var ScreenStyle = lipgloss.NewStyle().Background(ScreenBg)

// WarmWhitespace is the whitespace style for cursor row Place().
var WarmWhitespace = lipgloss.NewStyle().Background(Warm)

// Bg adds Background(ScreenBg) to a style copy — for normal rows.
func Bg(s lipgloss.Style) lipgloss.Style {
	return s.Copy().Background(ScreenBg)
}

// WBg adds Background(Warm) to a style copy — for cursor/active row.
func WBg(s lipgloss.Style) lipgloss.Style {
	return s.Copy().Background(Warm)
}

// BgStr renders plain (unstyled) text with ScreenBg background.
func BgStr(s string) string {
	return lipgloss.NewStyle().Background(ScreenBg).Render(s)
}

// WBgStr renders plain (unstyled) text with Warm background.
func WBgStr(s string) string {
	return lipgloss.NewStyle().Background(Warm).Render(s)
}
