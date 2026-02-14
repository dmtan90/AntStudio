# 🚀 AntFlow Deployment Guide

This guide describes how to deploy the AntFlow Standalone Engine (Backend + Frontend) as a system service on various platforms.

## 📋 Prerequisites
- **Binary**: Ensure you have built the binaries using `pnpm run build:standalone` in the `server` directory.
- **Port**: The default port is **4000**. Ensure it's open or configured in your firewall.
- **Database**: MongoDB and Redis should be accessible (as configured in your `.env`).

---

## 🪟 Windows Deployment

1. **Locate Script**: Go to `server/scripts/service-windows.ps1`.
2. **Run as Admin**: Open PowerShell as **Administrator**.
3. **Install Service**:
   ```powershell
   .\service-windows.ps1 -Action install
   ```
4. **Start Service**:
   ```powershell
   .\service-windows.ps1 -Action start
   ```
   *The service is configured to **auto-restart** after 10s, 30s, and 60s if it crashes.*

---

## 🐧 Linux Deployment (Ubuntu/Debian/CentOS)

1. **Locate Script**: `server/scripts/service-linux.sh`.
2. **Set Permissions**:
   ```bash
   chmod +x service-linux.sh
   ```
3. **Install Service**:
   ```bash
   sudo ./service-linux.sh install
   ```
4. **Commands**:
   - `sudo ./service-linux.sh start`
   - `sudo ./service-linux.sh status`
   - `sudo ./service-linux.sh stop`
   *Uses `systemd` with `Restart=always` policy.*

---

## 🍎 macOS Deployment

1. **Locate Script**: `server/scripts/service-macos.sh`.
2. **Install**:
   ```bash
   chmod +x service-macos.sh
   ./service-macos.sh install
   ```
3. **Unload/Stop**:
   ```bash
   ./service-macos.sh stop
   ```
   *Uses `launchd` with `KeepAlive` set to true.*

---

## 🌐 Nginx Configuration (Reverse Proxy)

To serve the application via a domain with SSL:
1. Copy `server/scripts/nginx.conf` to `/etc/nginx/sites-available/antflow`.
2. Update `server_name` to your domain.
3. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/antflow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 🛡️ Security & Reliability
- **Bundled & Packed**: Source code is bundled and delivered as an executable.
- **Auto-Restart**: All service handlers are configured to restart the engine automatically upon unexpected crashes.
- **Environment**: Keep your `.env` file in the same directory as the binary or set system environment variables.
