#!/bin/sh
export WEBKIT_DISABLE_DMABUF_RENDERER=1
exec "$(dirname "$0")/src-tauri/target/release/markdown-preview" "$@"
