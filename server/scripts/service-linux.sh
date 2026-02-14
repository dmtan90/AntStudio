#!/bin/bash
# AntFlow Linux Service Management Script
# Usage: sudo ./service-linux.sh [install|uninstall|start|stop|restart|status]

SERVICE_NAME="antflow"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
BINARY_PATH="$(realpath ../bin/antflow-linux)"
WORKING_DIR="$(realpath ..)"

if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (sudo)."
   exit 1
fi

case "$1" in
    install)
        if [ ! -f "$BINARY_PATH" ]; then
            echo "❌ Binary not found at $BINARY_PATH. Please build it first."
            exit 1
        fi
        
        echo "⚙️ Creating systemd service file..."
        cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=AntFlow AI Studio Engine
After=network.target mongodb.service redis.service

[Service]
Type=simple
User=$(logname)
WorkingDirectory=$WORKING_DIR
ExecStart=$BINARY_PATH
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=antflow

[Install]
WantedBy=multi-user.target
EOF
        
        systemctl daemon-reload
        systemctl enable "$SERVICE_NAME"
        echo "✅ Service '$SERVICE_NAME' installed and enabled."
        ;;
    uninstall)
        systemctl stop "$SERVICE_NAME"
        systemctl disable "$SERVICE_NAME"
        rm -f "$SERVICE_FILE"
        systemctl daemon-reload
        echo "✅ Service '$SERVICE_NAME' uninstalled."
        ;;
    start)
        systemctl start "$SERVICE_NAME"
        echo "✅ Service '$SERVICE_NAME' started."
        ;;
    stop)
        systemctl stop "$SERVICE_NAME"
        echo "✅ Service '$SERVICE_NAME' stopped."
        ;;
    restart)
        systemctl restart "$SERVICE_NAME"
        echo "✅ Service '$SERVICE_NAME' restarted."
        ;;
    status)
        systemctl status "$SERVICE_NAME"
        ;;
    *)
        echo "Usage: $0 {install|uninstall|start|stop|restart|status}"
        exit 1
esac
