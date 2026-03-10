# Transmute

Universal file converter that runs entirely on your machine. No uploads, no servers, 100% private.

Transmute converts files between 70+ formats — images, documents, audio, video, data, fonts, and spreadsheets. Use it as a **web app** in your browser or as a **CLI tool** in your terminal.

## Features

- **70+ formats supported** — Images, documents, audio, video, data, fonts, spreadsheets
- **100% client-side** — Files never leave your machine
- **Web app** — Beautiful browser-based interface at [Transmute Web](https://transmute-everything.netlify.app)
- **CLI tool** — Full-featured terminal interface for power users
- **Batch conversion** — Convert multiple files at once
- **Smart defaults** — Automatically suggests the best output format
- **Open source** — Inspect the code, contribute, or fork

## Quick Start

### Web App (Browser)

Visit **[Transmute Web](https://transmute-everything.netlify.app)** — just open in your browser and start converting. No installation needed.

### CLI (Terminal)

```bash
# Install
curl -fsSL https://raw.githubusercontent.com/noauf/Transmute/main/install.sh | bash

# Start transmute
transmute 
```

## Format Support

| Category | Formats |
|----------|---------|
| **Images** | PNG, JPG, JPEG, GIF, BMP, TIFF, WebP, AVIF, ICO, PSD, HEIC, HEIF, RAW (CR2, NEF, ARW, DNG) |
| **Documents** | PDF, DOCX, DOC, TXT, HTML, MD, RTF, ODT, EPUB, MOBI, CSV, TSV |
| **Audio** | MP3, WAV, FLAC, OGG, AAC, M4A, WMA, OPUS |
| **Video** | MP4, WebM, AVI, MOV, MKV, GIF |
| **Data** | JSON, XML, YAML, TOML, CSV, TSV, SQL |
| **Fonts** | TTF, OTF, WOFF, WOFF2 |
| **Spreadsheets** | XLSX, XLS, CSV, ODS |

## Installation

### CLI Installation

The installer detects your OS and architecture:

```bash
curl -fsSL https://raw.githubusercontent.com/noauf/Transmute/main/install.sh | bash
```

Or manually:

1. Download the latest release for your platform from [GitHub Releases](https://github.com/noauf/Transmute/releases)
2. Extract the archive
3. Move `transmute` to your PATH (e.g., `/usr/local/bin/`)

**Requirements:**
- macOS, Linux, or Windows
- For audio/video: FFmpeg (auto-installed on first use)

### Web App

No installation needed — just visit [Transmute Web](https://transmute-everything.netlify.app).

To run locally:

```bash
# Clone the repo
git clone https://github.com/noauf/Transmute.git
cd Transmute

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## CLI Keybindings

When running the TUI:

| Key | Action |
|-----|--------|
| `↑/↓` or `j/k` | Navigate files |
| `←/→` or `h/l` | Change target format |
| `space` | Toggle file selection |
| `a` | Select/deselect all |
| `p` | Preview file |
| `d` | Remove file from list |
| `x` | Delete converted output |
| `c` or `enter` | Start conversion |
| `?` | Show help |
| `q` | Quit |

## Development

### Project Structure

```
Transmute/
├── src/                    # Next.js web app
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
├── cli/                   # Go CLI tool
│   ├── cmd/               # CLI commands
│   └── internal/          # Core logic
│       ├── converter/     # File conversion
│       ├── detect/        # Format detection
│       ├── ffmpeg/        # FFmpeg manager
│       ├── theme/         # TUI styling
│       └── tui/           # Bubble Tea TUI
└── public/                # Static assets
```

### Tech Stack

- **Web App:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **CLI:** Go 1.25, Bubble Tea, Lip Gloss
- **Conversion:** FFmpeg, pdf.js, pdf-lib,libvips, and more

### Building the CLI

```bash
cd cli
go build -o transmute .
```

## License

APACHE 2.0 — see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Here's how to help:

1. **Report bugs** — Open an issue with details
2. **Suggest features** — We'd love to hear your ideas
3. **Add formats** — Check the converter package for where to add new format routes
4. **Improve the UI** — The web app needs your design skills

## Links

- **Web App:** [Transmute Web](https://transmute-everything.netlify.app)
- **CLI Docs:** See `--help` after installation
- **Issues:** [github.com/noauf/Transmute/issues](https://github.com/noauf/Transmute/issues)
- **Releases:** [github.com/noauf/Transmute/releases](https://github.com/noauf/Transmute/releases)

---

Made with love. Runs on your machine.
