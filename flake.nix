{
  description = "Markdown Preview - Tauri v2 desktop app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
          targets = [ "x86_64-unknown-linux-gnu" "aarch64-unknown-linux-gnu" ];
        };

        # Common build inputs
        commonBuildInputs = with pkgs; [
          rustToolchain
          cargo-tauri
          pkg-config
          nodejs_22
          nodePackages.pnpm
        ];

        # Linux-specific dependencies for Tauri/WebKitGTK
        linuxBuildInputs = with pkgs; [
          # Tauri v2 system deps
          webkitgtk_4_1
          gtk3
          libsoup_3
          glib
          glib-networking
          dbus
          openssl
          librsvg
          # GStreamer (optional, for media)
          gst_all_1.gstreamer
          gst_all_1.gst-plugins-base
          # Additional
          cairo
          pango
          harfbuzz
          gdk-pixbuf
          atk
          # Mesa/EGL for WebKitGTK rendering
          mesa
          libGL
          libGLU
          egl-wayland
          # GTK runtime deps
          fribidi
          fontconfig
          freetype
          gsettings-desktop-schemas
          hicolor-icon-theme
          adwaita-icon-theme
          shared-mime-info
          # AppImage bundling
          fuse
        ];

        # macOS-specific dependencies
        darwinBuildInputs = with pkgs; [
          darwin.apple_sdk.frameworks.Security
          darwin.apple_sdk.frameworks.CoreServices
          darwin.apple_sdk.frameworks.CoreFoundation
          darwin.apple_sdk.frameworks.Foundation
          darwin.apple_sdk.frameworks.AppKit
          darwin.apple_sdk.frameworks.WebKit
          darwin.apple_sdk.frameworks.Cocoa
        ];

        platformBuildInputs =
          if pkgs.stdenv.isLinux then linuxBuildInputs
          else if pkgs.stdenv.isDarwin then darwinBuildInputs
          else [ ];

        # Library path for runtime linking (Linux)
        linuxLibs = with pkgs; pkgs.lib.makeLibraryPath [
          webkitgtk_4_1
          gtk3
          libsoup_3
          glib
          dbus
          openssl
          librsvg
          cairo
          pango
          harfbuzz
          gdk-pixbuf
          mesa
          libGL
          libGLU
          egl-wayland
          fribidi
          fontconfig
          freetype
        ];

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = commonBuildInputs ++ platformBuildInputs;

          shellHook = ''
            echo "Markdown Preview dev environment loaded"
            echo "   Node: $(node --version)"
            echo "   Rust: $(rustc --version)"
            echo "   pnpm: $(pnpm --version)"
          '' + pkgs.lib.optionalString pkgs.stdenv.isLinux ''
            export LD_LIBRARY_PATH="${linuxLibs}:$LD_LIBRARY_PATH"
            export GIO_MODULE_PATH="${pkgs.glib-networking}/lib/gio/modules"
            # Use system GPU drivers if available, fall back to Mesa software rendering
            if [ -d /run/opengl-driver/lib ]; then
              export LIBGL_DRIVERS_PATH=/run/opengl-driver/lib/dri
            else
              export LIBGL_ALWAYS_SOFTWARE=1
            fi
            export WEBKIT_DISABLE_DMABUF_RENDERER=1
            export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:${pkgs.hicolor-icon-theme}/share:${pkgs.adwaita-icon-theme}/share:${pkgs.shared-mime-info}/share:$XDG_DATA_DIRS"
          '';

          RUST_SRC_PATH = "${rustToolchain}/lib/rustlib/src/rust/library";
        };

        packages.default = pkgs.stdenv.mkDerivation {
          pname = "markdown-preview";
          version = "0.1.0";
          src = ./.;

          nativeBuildInputs = commonBuildInputs ++ [ pkgs.makeWrapper ];
          buildInputs = platformBuildInputs;

          pnpmDeps = pkgs.stdenv.mkDerivation {
            pname = "markdown-preview-pnpm-deps";
            version = "0.1.0";
            src = ./.;
            nativeBuildInputs = with pkgs; [ nodejs_22 nodePackages.pnpm ];
            buildPhase = ''
              export HOME=$(mktemp -d)
              pnpm install --frozen-lockfile
            '';
            installPhase = ''
              mkdir -p $out
              cp -r node_modules $out/
            '';
            outputHashAlgo = "sha256";
            outputHashMode = "recursive";
          };

          buildPhase = ''
            export HOME=$(mktemp -d)
            ln -s $pnpmDeps/node_modules node_modules
            pnpm build
            cd src-tauri
            cargo build --release
          '' + pkgs.lib.optionalString pkgs.stdenv.isLinux ''
            export LD_LIBRARY_PATH="${linuxLibs}:$LD_LIBRARY_PATH"
          '';

          installPhase = ''
            mkdir -p $out/bin
            cp src-tauri/target/release/markdown-preview $out/bin/
          '' + pkgs.lib.optionalString pkgs.stdenv.isLinux ''
            wrapProgram $out/bin/markdown-preview \
              --prefix LD_LIBRARY_PATH : "${linuxLibs}" \
              --set GIO_MODULE_PATH "${pkgs.glib-networking}/lib/gio/modules" \
              --set WEBKIT_DISABLE_DMABUF_RENDERER 1
          '';
        };
      }
    );
}
