package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/noauf/transmute-cli/internal/ffmpeg"
	"github.com/noauf/transmute-cli/internal/tui"
	"github.com/noauf/transmute-cli/internal/update"
)

// Execute runs the CLI.
func Execute() {
	args := os.Args[1:]

	// Handle flags
	var outputDir string
	var installFFmpeg bool
	var doUpdate bool
	var paths []string

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "-d", "--output-dir":
			if i+1 < len(args) {
				outputDir = args[i+1]
				i++
			} else {
				fmt.Fprintln(os.Stderr, "Error: -d requires a directory argument")
				os.Exit(1)
			}
		case "--install-ffmpeg":
			installFFmpeg = true
		case "--update":
			doUpdate = true
		case "-h", "--help":
			printUsage()
			os.Exit(0)
		case "-v", "--version":
			fmt.Printf("transmute v%s\n", update.CurrentVersion)
			os.Exit(0)
		default:
			if args[i][0] == '-' {
				fmt.Fprintf(os.Stderr, "Unknown flag: %s\n", args[i])
				printUsage()
				os.Exit(1)
			}
			paths = append(paths, args[i])
		}
	}

	// Handle --install-ffmpeg
	if installFFmpeg {
		handleInstallFFmpeg()
		return
	}

	// Handle --update
	if doUpdate {
		handleUpdate()
		return
	}

	// If output dir specified, ensure it exists
	if outputDir != "" {
		if err := os.MkdirAll(outputDir, 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "Error creating output directory: %v\n", err)
			os.Exit(1)
		}
	}

	// Expand glob patterns
	expandedPaths := expandGlobs(paths)

	// If no paths given, use current directory
	if len(expandedPaths) == 0 {
		// Launch TUI with empty state — user can see instructions
		expandedPaths = []string{"."}
	}

	// Create and run TUI
	model := tui.New(expandedPaths, outputDir)
	p := tea.NewProgram(model, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func expandGlobs(patterns []string) []string {
	var result []string
	for _, pattern := range patterns {
		matches, err := filepath.Glob(pattern)
		if err != nil {
			// Not a glob, treat as literal path
			result = append(result, pattern)
			continue
		}
		if len(matches) == 0 {
			// No matches, keep original (might be a direct path)
			result = append(result, pattern)
		} else {
			result = append(result, matches...)
		}
	}
	return result
}

func handleInstallFFmpeg() {
	if ffmpeg.IsAvailable() {
		path, _ := ffmpeg.Resolve()
		fmt.Printf("ffmpeg is already available at: %s\n", path)
		return
	}

	fmt.Println("Downloading ffmpeg...")
	err := ffmpeg.Download(func(downloaded int64) {
		fmt.Printf("\r  Downloaded %.1f MB", float64(downloaded)/1024/1024)
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "\nError downloading ffmpeg: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("\n  ffmpeg installed successfully!")
}

func handleUpdate() {
	err := update.Run(func(msg string) {
		fmt.Println(msg)
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "Update failed: %v\n", err)
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println(`transmute - Universal file converter

Usage:
  transmute [files...]              Convert files interactively
  transmute *.png                   Convert all PNG files
  transmute ./photos/               Convert all files in directory
  transmute file.csv -d ./output/   Output to specific directory

Flags:
  -d, --output-dir <dir>   Output converted files to this directory
  --install-ffmpeg          Download and install ffmpeg for audio/video
  --update                  Update transmute to the latest version
  -h, --help               Show this help
  -v, --version            Show version

Interactive Controls:
  ↑/↓ or j/k              Navigate files
  ←/→ or h/l              Change target format
  space                    Toggle file selection
  a                        Select / deselect all
  c or enter               Start conversion
  d                        Remove file from list
  ?                        Toggle help
  q or ctrl+c              Quit`)
}
