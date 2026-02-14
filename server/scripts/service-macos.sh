#!/bin/bash
# AntFlow macOS Service Management Script
# Usage: ./service-macos.sh [install|uninstall|start|stop]

SERVICE_ID="com.antflow.engine"
PLIST_FILE="$HOME/Library/LaunchAgents/${SERVICE_ID}.plist"
BINARY_PATH="$(realpath ../bin/antflow-macos)"
WORKING_DIR="$(realpath ..)"

case "$1" in
    install)
        if [ ! -f "$BINARY_PATH" ]; then
            echo "❌ Binary not found at $BINARY_PATH. Please build it first."
            exit 1
        fi

        echo "⚙️ Creating launchd plist file..."
        cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$SERVICE_ID</string>
    <key>ProgramArguments</key>
    <array>
        <string>$BINARY_PATH</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$WORKING_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$WORKING_DIR/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$WORKING_DIR/logs/stderr.log</string>
</dict>
</plist>
EOF
        mkdir -p "$WORKING_DIR/logs"
        launchctl load "$PLIST_FILE"
        echo "✅ Service '$SERVICE_ID' installed and loaded."
        ;;
    uninstall)
        launchctl unload "$PLIST_FILE"
        rm -f "$PLIST_FILE"
        echo "✅ Service '$SERVICE_ID' uninstalled."
        ;;
    start)
        launchctl start "$SERVICE_ID"
        echo "✅ Service '$SERVICE_ID' started."
        ;;
    stop)
        launchctl stop "$SERVICE_ID"
        echo "✅ Service '$SERVICE_ID' stopped."
        ;;
    *)
        echo "Usage: $0 {install|uninstall|start|stop}"
        exit 1
esac
