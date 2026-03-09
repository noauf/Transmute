#!/bin/sh
# Transmute CLI installer
# Usage: curl -fsSL https://raw.githubusercontent.com/noauf/Transmute/main/install.sh | sh
set -e

REPO="noauf/Transmute"
BINARY="transmute"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Darwin)  OS="darwin" ;;
  Linux)   OS="linux" ;;
  MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
  *)
    echo "Error: unsupported operating system: $OS"
    exit 1
    ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="x86_64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "Error: unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# Determine file extension
if [ "$OS" = "windows" ]; then
  EXT="zip"
else
  EXT="tar.gz"
fi

ASSET="${BINARY}-${OS}-${ARCH}.${EXT}"

echo ""
echo "  Transmute CLI installer"
echo "  ======================"
echo ""
echo "  OS:   $OS"
echo "  Arch: $ARCH"
echo ""

# Get latest release tag
echo "  Fetching latest release..."
TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

if [ -z "$TAG" ]; then
  echo "  Error: could not determine latest release"
  exit 1
fi

echo "  Latest version: $TAG"

DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"

echo "  Downloading $ASSET..."

# Create temp directory
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

curl -fsSL "$DOWNLOAD_URL" -o "${TMP_DIR}/${ASSET}"

# Extract
echo "  Extracting..."
if [ "$EXT" = "tar.gz" ]; then
  tar -xzf "${TMP_DIR}/${ASSET}" -C "$TMP_DIR"
else
  unzip -q "${TMP_DIR}/${ASSET}" -d "$TMP_DIR"
fi

# Find the binary
BIN_PATH=""
if [ -f "${TMP_DIR}/${BINARY}" ]; then
  BIN_PATH="${TMP_DIR}/${BINARY}"
elif [ -f "${TMP_DIR}/${BINARY}-${OS}-${ARCH}/${BINARY}" ]; then
  BIN_PATH="${TMP_DIR}/${BINARY}-${OS}-${ARCH}/${BINARY}"
fi

if [ -z "$BIN_PATH" ]; then
  echo "  Error: could not find ${BINARY} binary in archive"
  exit 1
fi

chmod +x "$BIN_PATH"

# Determine install directory — try in order of preference
INSTALL_DIR=""
NEEDS_PATH_HINT=""

if [ -w "/usr/local/bin" ]; then
  INSTALL_DIR="/usr/local/bin"
elif command -v sudo >/dev/null 2>&1; then
  # Try sudo to /usr/local/bin
  echo "  Installing to /usr/local/bin (requires sudo)..."
  if sudo mv "$BIN_PATH" "/usr/local/bin/${BINARY}" 2>/dev/null; then
    sudo chmod +x "/usr/local/bin/${BINARY}"
    INSTALL_DIR="/usr/local/bin"
  fi
fi

# Fallback: ~/.local/bin (no sudo needed)
if [ -z "$INSTALL_DIR" ]; then
  INSTALL_DIR="${HOME}/.local/bin"
  mkdir -p "$INSTALL_DIR"
  mv "$BIN_PATH" "${INSTALL_DIR}/${BINARY}"
  chmod +x "${INSTALL_DIR}/${BINARY}"

  # Check if ~/.local/bin is in PATH
  case ":${PATH}:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
      NEEDS_PATH_HINT="true"
      ;;
  esac
else
  if [ -f "$BIN_PATH" ]; then
    mv "$BIN_PATH" "${INSTALL_DIR}/${BINARY}"
    chmod +x "${INSTALL_DIR}/${BINARY}"
  fi
fi

echo ""
echo "  Installed transmute $TAG to ${INSTALL_DIR}/${BINARY}"
echo ""

# If we installed to a dir not in PATH, tell the user how to fix it
if [ "$NEEDS_PATH_HINT" = "true" ]; then
  SHELL_NAME="$(basename "$SHELL")"
  case "$SHELL_NAME" in
    zsh)  RC_FILE="~/.zshrc" ;;
    bash) RC_FILE="~/.bashrc" ;;
    fish) RC_FILE="~/.config/fish/config.fish" ;;
    *)    RC_FILE="your shell config" ;;
  esac

  echo "  To make it globally available, add ~/.local/bin to your PATH:"
  echo ""
  if [ "$SHELL_NAME" = "fish" ]; then
    echo "    fish_add_path ${INSTALL_DIR}"
  else
    echo "    echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ${RC_FILE}"
  fi
  echo ""
  echo "  Then restart your terminal, or run:"
  echo ""
  if [ "$SHELL_NAME" = "fish" ]; then
    echo "    fish_add_path ${INSTALL_DIR}"
  else
    echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
  fi
  echo ""
fi

echo "  Get started:"
echo "    transmute *.png          Convert all PNGs"
echo "    transmute ./photos/      Convert all files in a directory"
echo "    transmute --help         Show all options"
echo ""
