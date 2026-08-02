#!/usr/bin/env bash
# Start AntStudio in Silent / Headless Mode for Linux Server

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "==================================================="
echo "  Starting AntStudio in Silent Server Mode...      "
echo "==================================================="

if [ -f "$DIR/AntStudio" ]; then
    "$DIR/AntStudio" --silent
elif [ -f "$DIR/antstudio" ]; then
    "$DIR/antstudio" --silent
else
    echo "Executable not found in $DIR"
    exit 1
fi
