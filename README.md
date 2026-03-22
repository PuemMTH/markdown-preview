# Markdown Preview

A desktop markdown previewer with Mermaid diagram support, built with Tauri + React.

## Features

- Markdown rendering with live preview
- Mermaid diagram support with zoom and PNG export
- Dark/Light theme toggle
- Open files via CLI, drag-drop, or file dialog
- Save as PDF with A4 page formatting
- Right-click context menu for diagrams

## Install

### Quick install (Linux/macOS)

```bash
curl -sSf https://raw.githubusercontent.com/PuemMTH/markdown-preview/main/install.sh | sh
```

### Download

Pre-built binaries for all platforms are available on the [Releases](https://github.com/PuemMTH/markdown-preview/releases/latest) page:

| Platform | File |
|---|---|
| Windows | `.exe` / `.msi` |
| macOS (Apple Silicon) | `.dmg` |
| Linux (Debian/Ubuntu) | `.deb` |
| Linux (Fedora/RHEL) | `.rpm` |
| Linux (Universal) | `.AppImage` |

## Usage

```bash
# Open app
markdown-preview

# Open a specific file
markdown-preview path/to/file.md
```

- **Esc** — Toggle quick menu (theme, fullscreen, exit)
- **Right-click diagram** — Save as PNG
- **Hover diagram** — Click to open full-screen viewer with zoom

## Development

### Prerequisites

- Node.js 22+
- Rust
- pnpm

### With Nix

```bash
nix develop
pnpm install
pnpm tauri dev
```

### Without Nix

```bash
pnpm install
pnpm tauri dev
```

### Build

```bash
pnpm tauri build
```

## License

[MIT](LICENSE)
