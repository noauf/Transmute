#!/bin/sh
# Transmute CLI installer
# Usage: curl -fsSL https://raw.githubusercontent.com/noauf/Transmute/main/install.sh | sh
set -e

REPO="noauf/Transmute"
BINARY="transmute"
INSTALL_DIR="/usr/local/bin"

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

echo "Transmute CLI installer"
echo "======================"
echo ""
echo "  OS:   $OS"
echo "  Arch: $ARCH"
echo ""

# Get latest release tag
echo "Fetching latest release..."
TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

if [ -z "$TAG" ]; then
  echo "Error: could not determine latest release"
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
  echo "Error: could not find ${BINARY} binary in archive"
  exit 1
fi

chmod +x "$BIN_PATH"

# Install
echo "  Installing to ${INSTALL_DIR}/${BINARY}..."
if [ -w "$INSTALL_DIR" ]; then
  mv "$BIN_PATH" "${INSTALL_DIR}/${BINARY}"
else
  echo "  (requires sudo)"
  sudo mv "$BIN_PATH" "${INSTALL_DIR}/${BINARY}"
fi

echo ""
echo "  Installed transmute $TAG to ${INSTALL_DIR}/${BINARY}"
echo ""
echo "  Get started:"
echo "    transmute *.png          Convert all PNGs"
echo "    transmute ./files/       Convert all files in a directory"
echo "    transmute --help         Show all options"
echo ""
