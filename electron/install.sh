#!/usr/bin/env bash
# =============================================================================
#  AntStudio — Install as System Service (Linux / macOS)
#  Registers the app to auto-start on boot in silent/headless mode.
#
#  Usage (from the directory containing the AntStudio executable):
#    chmod +x install.sh && sudo ./install.sh
#
#  To uninstall:
#    sudo ./install.sh --uninstall
# =============================================================================

set -euo pipefail

SERVICE_NAME="antstudio"
DISPLAY_NAME="AntStudio Server"
DESCRIPTION="AntStudio AI Live Studio — headless server mode"

# ---- Resolve install directory (where this script lives) --------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---- Detect the executable --------------------------------------------------
if   [ -f "$SCRIPT_DIR/AntStudio" ];  then EXEC="$SCRIPT_DIR/AntStudio"
elif [ -f "$SCRIPT_DIR/antstudio" ];  then EXEC="$SCRIPT_DIR/antstudio"
else
    echo "[ERROR] AntStudio executable not found in $SCRIPT_DIR"
    echo "        Expected: AntStudio  or  antstudio"
    exit 1
fi

# Ensure executable bit is set
chmod +x "$EXEC"

# ---- Root check -------------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
    echo "[ERROR] This script must be run as root (use sudo)."
    exit 1
fi

# ---- Uninstall path ---------------------------------------------------------
if [ "${1:-}" = "--uninstall" ]; then
    echo "==================================================="
    echo "  Uninstalling AntStudio Service..."
    echo "==================================================="

    if command -v systemctl &>/dev/null; then
        systemctl stop    "$SERVICE_NAME" 2>/dev/null || true
        systemctl disable "$SERVICE_NAME" 2>/dev/null || true
        rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
        systemctl daemon-reload
        echo "[OK] systemd service removed."

    elif [ "$(uname)" = "Darwin" ]; then
        launchctl unload "/Library/LaunchDaemons/com.antstudio.plist" 2>/dev/null || true
        rm -f "/Library/LaunchDaemons/com.antstudio.plist"
        echo "[OK] launchd service removed."
    fi

    echo "[DONE] AntStudio service uninstalled."
    exit 0
fi

# ---- # --no-sandbox is required for Electron on most Linux server environments
# (headless, containers, root, restricted namespaces, etc.)
EXTRA_FLAGS="--no-sandbox"
XVFB_CMD=""

# Check for virtual framebuffer (needed on headless Linux without a display)
if command -v xvfb-run &>/dev/null; then
    XVFB_CMD="xvfb-run --auto-servernum --server-args=\"-screen 0 1024x768x24\""
fi

echo "==================================================="
echo "  Installing AntStudio as a System Service"
echo "==================================================="
echo "  Executable : $EXEC"
echo "  Service    : $SERVICE_NAME"
echo ""

# ============================================================================
#  LINUX — systemd
# ============================================================================
if command -v systemctl &>/dev/null; then
    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

    # Build ExecStart — wrap with xvfb-run if available
    if [ -n "$XVFB_CMD" ]; then
        EXEC_START="$(command -v xvfb-run) --auto-servernum --server-args=\"-screen 0 1024x768x24\" $EXEC --silent $EXTRA_FLAGS"
    else
        EXEC_START="$EXEC --silent $EXTRA_FLAGS"
    fi

    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=$DESCRIPTION
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$EXEC_START
WorkingDirectory=$SCRIPT_DIR
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME
Environment=SILENT_MODE=true
Environment=NODE_ENV=production
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable  "$SERVICE_NAME"
    systemctl restart "$SERVICE_NAME"

    echo ""
    echo "[OK] systemd service installed and started."
    echo ""
    echo "  Useful commands:"
    echo "    sudo systemctl status  $SERVICE_NAME"
    echo "    sudo systemctl restart $SERVICE_NAME"
    echo "    sudo systemctl stop    $SERVICE_NAME"
    echo "    sudo journalctl -u     $SERVICE_NAME -f"
    echo ""
    echo "  To uninstall: sudo $SCRIPT_DIR/install.sh --uninstall"

# ============================================================================
#  macOS — launchd
# ============================================================================
elif [ "$(uname)" = "Darwin" ]; then
    PLIST_PATH="/Library/LaunchDaemons/com.antstudio.plist"
    LOG_DIR="/var/log/antstudio"
    mkdir -p "$LOG_DIR"

    cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.antstudio</string>

  <key>ProgramArguments</key>
  <array>
    <string>$EXEC</string>
    <string>--silent</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$SCRIPT_DIR</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>SILENT_MODE</key><string>true</string>
    <key>NODE_ENV</key><string>production</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>$LOG_DIR/stdout.log</string>

  <key>StandardErrorPath</key>
  <string>$LOG_DIR/stderr.log</string>

  <key>ThrottleInterval</key>
  <integer>10</integer>
</dict>
</plist>
EOF

    chown root:wheel "$PLIST_PATH"
    chmod 644        "$PLIST_PATH"

    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    launchctl load   "$PLIST_PATH"

    echo ""
    echo "[OK] launchd service installed and started."
    echo ""
    echo "  Useful commands:"
    echo "    sudo launchctl list | grep antstudio"
    echo "    sudo launchctl stop  com.antstudio"
    echo "    sudo launchctl start com.antstudio"
    echo "    tail -f $LOG_DIR/stdout.log"
    echo ""
    echo "  To uninstall: sudo $SCRIPT_DIR/install.sh --uninstall"

else
    echo "[ERROR] Could not detect systemd or launchd. Manual installation required."
    exit 1
fi

echo ""
echo "==================================================="
echo "  AntStudio service installation complete!"
echo "  The app will now start automatically on boot."
echo "==================================================="
