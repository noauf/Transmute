# Transmute CLI installer for Windows
# Usage: irm https://raw.githubusercontent.com/noauf/Transmute/main/install.ps1 | iex

function Install-Transmute {
    $REPO = "noauf/Transmute"
    $BINARY = "transmute"

    Write-Host ""
    Write-Host "  Transmute CLI installer"
    Write-Host "  ======================"
    Write-Host ""

    # Detect architecture
    if (-not [System.Environment]::Is64BitOperatingSystem) {
        Write-Host "  Error: 32-bit Windows is not supported" -ForegroundColor Red
        return
    }
    $ARCH = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x86_64" }

    Write-Host "  OS:   windows"
    Write-Host "  Arch: $ARCH"
    Write-Host ""

    $ASSET = "$BINARY-windows-$ARCH.zip"

    # Get latest release tag
    Write-Host "  Fetching latest release..."
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest" -Headers @{ "User-Agent" = "transmute-installer" }
        $TAG = $release.tag_name
    } catch {
        Write-Host "  Error: could not fetch latest release: $_" -ForegroundColor Red
        return
    }

    if (-not $TAG) {
        Write-Host "  Error: could not determine latest release" -ForegroundColor Red
        return
    }

    Write-Host "  Latest version: $TAG"

    $DOWNLOAD_URL = "https://github.com/$REPO/releases/download/$TAG/$ASSET"

    # Create temp directory
    $TMP_DIR = Join-Path $env:TEMP "transmute-install-$(Get-Random)"
    New-Item -ItemType Directory -Path $TMP_DIR | Out-Null

    try {
        $ZIP_PATH = Join-Path $TMP_DIR $ASSET

        Write-Host "  Downloading $ASSET..."
        Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $ZIP_PATH -UseBasicParsing

        Write-Host "  Extracting..."
        Expand-Archive -Path $ZIP_PATH -DestinationPath $TMP_DIR -Force

        $EXE_NAME = "$BINARY.exe"
        $EXE_SOURCE = Join-Path $TMP_DIR "$BINARY-windows-$ARCH.exe"
        if (-not (Test-Path $EXE_SOURCE)) {
            $EXE_SOURCE = Join-Path $TMP_DIR $EXE_NAME
        }

        if (-not (Test-Path $EXE_SOURCE)) {
            Write-Host "  Error: could not find $EXE_NAME in archive" -ForegroundColor Red
            return
        }

        # Determine install directory
        $INSTALL_DIR = "$env:LOCALAPPDATA\transmute\bin"
        New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null

        $INSTALL_PATH = Join-Path $INSTALL_DIR $EXE_NAME
        Copy-Item -Path $EXE_SOURCE -Destination $INSTALL_PATH -Force

        Write-Host ""
        Write-Host "  Installed transmute $TAG to $INSTALL_PATH" -ForegroundColor Green
        Write-Host ""

        # Add to PATH if not already there
        $USER_PATH = [System.Environment]::GetEnvironmentVariable("PATH", "User")
        if ($USER_PATH -notlike "*$INSTALL_DIR*") {
            [System.Environment]::SetEnvironmentVariable("PATH", "$USER_PATH;$INSTALL_DIR", "User")
            Write-Host "  Added $INSTALL_DIR to your PATH."
            Write-Host "  Restart your terminal for the PATH change to take effect."
            Write-Host ""
        }

        Write-Host "  Get started:"
        Write-Host "    transmute *.png          Convert all PNGs"
        Write-Host "    transmute ./photos/      Convert all files in a directory"
        Write-Host "    transmute --help         Show all options"
        Write-Host ""

    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    } finally {
        Remove-Item -Recurse -Force $TMP_DIR -ErrorAction SilentlyContinue
    }
}

Install-Transmute
