#!/bin/sh
set -e

REPO="PuemMTH/markdown-preview"
APP="markdown-preview"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { printf "${GREEN}[info]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[warn]${NC} %s\n" "$1"; }
error() { printf "${RED}[error]${NC} %s\n" "$1" >&2; exit 1; }

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)  echo "linux" ;;
        Darwin*) echo "macos" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *) error "Unsupported OS: $(uname -s)" ;;
    esac
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)  echo "x86_64" ;;
        aarch64|arm64) echo "aarch64" ;;
        *) error "Unsupported architecture: $(uname -m)" ;;
    esac
}

# Get latest release tag from GitHub
get_latest_version() {
    if command -v curl >/dev/null 2>&1; then
        curl -sSf "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/'
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/'
    else
        error "curl or wget is required"
    fi
}

# Download file
download() {
    url="$1"
    output="$2"
    if command -v curl >/dev/null 2>&1; then
        curl -sSfL "$url" -o "$output"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$output" "$url"
    fi
}

main() {
    OS=$(detect_os)
    ARCH=$(detect_arch)
    VERSION="${1:-$(get_latest_version)}"

    if [ -z "$VERSION" ]; then
        error "Could not determine latest version. Specify version as argument: ./install.sh v0.1.0"
    fi

    info "Installing ${APP} ${VERSION} for ${OS}/${ARCH}"

    # Determine asset name based on OS
    case "${OS}" in
        linux)
            if [ "$ARCH" = "x86_64" ]; then
                ASSET="${APP}_${VERSION#v}_amd64.deb"
                ASSET_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET}"

                # Try .deb first, then raw binary
                TMPDIR=$(mktemp -d)
                trap 'rm -rf "$TMPDIR"' EXIT

                if command -v dpkg >/dev/null 2>&1; then
                    info "Downloading ${ASSET}..."
                    download "$ASSET_URL" "${TMPDIR}/${ASSET}" 2>/dev/null && {
                        info "Installing .deb package..."
                        sudo dpkg -i "${TMPDIR}/${ASSET}"
                        info "Installed successfully!"
                        return
                    }
                fi

                # Fallback: download AppImage
                ASSET="${APP}_${VERSION#v}_amd64.AppImage"
                ASSET_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET}"
                info "Downloading AppImage..."
                download "$ASSET_URL" "${TMPDIR}/${APP}.AppImage" 2>/dev/null && {
                    chmod +x "${TMPDIR}/${APP}.AppImage"
                    sudo mv "${TMPDIR}/${APP}.AppImage" "${INSTALL_DIR}/${APP}"
                    info "Installed to ${INSTALL_DIR}/${APP}"
                    return
                }

                error "No compatible Linux package found for ${VERSION}"
            else
                error "Linux ${ARCH} builds are not available yet"
            fi
            ;;
        macos)
            TMPDIR=$(mktemp -d)
            trap 'rm -rf "$TMPDIR"' EXIT

            if [ "$ARCH" = "aarch64" ]; then
                ASSET="${APP}_${VERSION#v}_aarch64.dmg"
            else
                ASSET="${APP}_${VERSION#v}_x64.dmg"
            fi
            ASSET_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET}"

            info "Downloading ${ASSET}..."
            download "$ASSET_URL" "${TMPDIR}/${ASSET}"

            info "Mounting DMG..."
            hdiutil attach "${TMPDIR}/${ASSET}" -quiet -mountpoint "${TMPDIR}/mount"
            cp -R "${TMPDIR}/mount/${APP}.app" /Applications/
            hdiutil detach "${TMPDIR}/mount" -quiet

            info "Installed to /Applications/${APP}.app"
            ;;
        windows)
            error "On Windows, download the .msi installer from: https://github.com/${REPO}/releases/latest"
            ;;
    esac
}

main "$@"
