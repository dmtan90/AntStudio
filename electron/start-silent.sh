#!/usr/bin/env bash
# Start AntStudio in Silent / Headless Mode for Linux Server

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "==================================================="
echo "  Starting AntStudio in Silent Server Mode...      "
echo "==================================================="

# --no-sandbox is required for Electron on most Linux server environments
# (headless, containers, root, restricted namespaces, etc.)
EXTRA_FLAGS="--no-sandbox"

# Determine the executable path
if [ -f "$DIR/AntStudio" ]; then
    EXEC="$DIR/AntStudio"
elif [ -f "$DIR/antstudio" ]; then
    EXEC="$DIR/antstudio"
else
    echo "[ERROR] Executable not found in $DIR"
    exit 1
fi

# If no DISPLAY is set (headless server), use xvfb-run as a fallback.
# The --headless Chromium flag in main.cjs should handle most cases,
# but some Electron versions still require a real/virtual display to init Ozone.
if [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ]; then
    if command -v xvfb-run &>/dev/null; then
        echo "[INFO] No display found, using xvfb-run (virtual framebuffer)..."
        exec xvfb-run --auto-servernum --server-args="-screen 0 1024x768x24" \
            "$EXEC" --silent $EXTRA_FLAGS
    else
        echo "[WARN] No display found and xvfb-run not available."
        echo "[WARN] Install it with: apt-get install -y xvfb"
        echo "[INFO] Attempting native headless mode (--headless flags)..."
        exec "$EXEC" --silent $EXTRA_FLAGS
    fi
else
    exec "$EXEC" --silent $EXTRA_FLAGS
fi
