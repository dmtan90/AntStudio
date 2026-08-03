# AntStudio Desktop App Guide (Windows, macOS, Linux)

Welcome to the **AntStudio Desktop Application Guide**. AntStudio provides multi-platform desktop release packages for Windows, macOS, and Linux with embedded AI media rendering and 24/7 autonomous live-streaming capabilities.

---

## 🚀 1. Installation & Release Packages

Each platform build produces exact target artifacts matching the project configuration:

### 🪟 Windows Setup

- **Release Package**: `AntStudio-1.0.0-win.zip` (Portable ZIP archive)
- **Installation & Launch**:
  1. Extract `AntStudio-1.0.0-win.zip` to your chosen folder.
  2. Run **`AntStudio.exe`** to start the application with GUI.
- **Silent Background Launch**:
  - Double-click `start-silent.bat`, or run from Command Prompt:
    ```cmd
    AntStudio.exe --silent
    ```

---

### 🍎 macOS Setup (Apple Silicon & Intel)

- **Release Packages**:
  - `AntStudio-1.0.0.dmg` (Disk Image Installer)
  - `AntStudio-1.0.0-mac.zip` (Mac Application Archive)
- **Installation & Launch**:
  1. Double-click `AntStudio-1.0.0.dmg` (or extract `AntStudio-1.0.0-mac.zip`).
  2. Drag **`AntStudio.app`** into your **Applications** folder.
- **Permissions & Gatekeeper**:
  - Grant Camera & Microphone access on first launch if prompted.
  - If macOS Gatekeeper displays *"App cannot be opened because it is from an unidentified developer"*, right-click `AntStudio.app`, click **Open**, or run in terminal:
    ```bash
    xattr -cr /Applications/AntStudio.app
    ```

---

### 🐧 Linux Setup (Ubuntu / Debian / Fedora)

- **Release Package**: `AntStudio-1.0.0-linux.tar.gz`
- **Installation & Launch**:
  1. Extract the tarball:
     ```bash
     tar -xzf AntStudio-1.0.0-linux.tar.gz
     cd AntStudio-1.0.0-linux
     ```
  2. Run the application (`.sh` files are already executable in packaged builds):
     ```bash
     ./AntStudio
     ```
- **Silent / Headless Launch**:
  ```bash
  ./start-silent.sh
  # Or run directly:
  ./AntStudio --silent
  ```
  > `start-silent.sh` auto-detects headless environments and uses `xvfb-run` if available.

---

## 🔄 2. Install as a System Service (Auto-start on Boot)

AntStudio ships with `install.sh` (Linux/macOS) and `install.bat` (Windows) to register the app as a **system service** that starts automatically on boot in silent/headless mode.

### 🐧 Linux — systemd service

```bash
# Must be run as root
sudo ./install.sh
```

This script:
- Detects the correct executable name (`AntStudio` or `antstudio`)
- Creates `/etc/systemd/system/antstudio.service`
- Enables the service to start on boot (`systemctl enable`)
- Starts the service immediately (`systemctl start`)
- Adds `--no-sandbox` automatically when running as root
- Uses `xvfb-run` on headless servers if available

**Useful management commands:**

```bash
sudo systemctl status  antstudio       # Check service status
sudo systemctl restart antstudio       # Restart the service
sudo systemctl stop    antstudio       # Stop the service
sudo journalctl -u     antstudio -f    # Stream live logs
```

**Uninstall:**
```bash
sudo ./install.sh --uninstall
```

---

### 🍎 macOS — launchd daemon

```bash
sudo ./install.sh
```

- Creates `/Library/LaunchDaemons/com.antstudio.plist`
- Logs written to `/var/log/antstudio/stdout.log` and `stderr.log`
- Service auto-restarts on failure (`KeepAlive=true`)

**Useful management commands:**
```bash
sudo launchctl list | grep antstudio
sudo launchctl stop  com.antstudio
sudo launchctl start com.antstudio
tail -f /var/log/antstudio/stdout.log
```

**Uninstall:**
```bash
sudo ./install.sh --uninstall
```

---

### 🪟 Windows — Windows Service (NSSM)

Run **`install.bat`** as **Administrator** (right-click → *Run as administrator*).

This script:
- **Auto-downloads `nssm.exe`** from [nssm.cc](https://nssm.cc) if not present
- Registers `AntStudio` as a Windows Service with `SERVICE_AUTO_START`
- Configures auto-restart on crash (10-second delay)
- Writes logs to `logs\stdout.log` and `logs\stderr.log` (with daily rotation, max 10 MB)

**Useful management commands:**
```cmd
sc query  AntStudio
sc stop   AntStudio
sc start  AntStudio
type logs\stdout.log
```

**Uninstall:**
```cmd
:: Run as Administrator
install.bat --uninstall
```

---

## ⚙️ 3. Configuration & Environment Files (`resources/`)

The application stores encrypted defaults and custom configurations in the `resources/` directory inside the app installation path:

- **`resources/.env.enc`**: Encrypted default system configuration.
- **`resources/.env`**: Custom user environment file for overriding default variables (based on `.env.electron` template):

```env
MONGODB_URI=mongodb://localhost:27017/antstudio
JWT_SECRET=your-super-secret-jwt-key
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket
GMI_API_KEY=your-gmicloud-api-key
GCP_PROJECT=your-gcp-project-id
GCP_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=1
GOOGLE_APPLICATION_CREDENTIALS=gcp-service-account.json
PORT=5000
BASE_URL=http://localhost:5000
RTMP_PORT=1935
```

---

### 🔑 Google Cloud Agent Authentication (`gcp-service-account.json`)

To use Google Cloud AI features (Gemini Flash, Vertex AI, Veo Video Generation, Lyria Music):

1. **Register Service Account**: Go to **Google Cloud Console > IAM & Admin > Service Accounts**.
2. **Download Key JSON**: Create a Service Account Key in JSON format and download it as `gcp-service-account.json`.
3. **Place File in `resources/`**: Copy `gcp-service-account.json` into the app's **`resources/`** directory next to `app.asar`.
4. **Update `resources/.env`**: Ensure `GOOGLE_APPLICATION_CREDENTIALS=gcp-service-account.json` is set.

---

## 🛠️ 4. Application Parameters & CLI Flags

### 🖥️ Runtime Parameters

| Parameter / Flag   | Type    | Description                                                       |
| :----------------- | :------ | :---------------------------------------------------------------- |
| `--silent`         | CLI Flag | Launches without GUI window (headless server mode).              |
| `--headless`       | CLI Flag | Equivalent to `--silent`.                                        |
| `SILENT_MODE=true` | Env Var | Environment variable alternative to `--silent`.                  |
| `PORT`             | Env Var | Backend HTTP API server port (Default: `5000`).                  |
| `BASE_URL`         | Env Var | Base server URL (Default: `http://localhost:5000`).              |
| `RTMP_PORT`        | Env Var | RTMP streaming server port (Default: `1935`).                    |

---

### 📦 Build Parameters (`electron/build.cjs`)

| Parameter / Flag      | Example                                      | Description                                                              |
| :-------------------- | :------------------------------------------- | :----------------------------------------------------------------------- |
| `--target=<platform>` | `node electron/build.cjs --target=linux`     | Build target: `win`, `linux`, `mac`, or `all`.                          |
| `--env=<file>`        | `node electron/build.cjs --env=.env`         | Encrypts the specified env file to `electron/.env.enc` before packaging. |
| `ENV_FILE=<file>`     | `ENV_FILE=.env node electron/build.cjs`      | Environment variable equivalent for `--env`.                            |

> **Note:** Linux/macOS builds automatically apply `chmod +x` to all `.sh` files and the main executable via the `afterPack` hook — no manual permission setup required after extracting the archive.

---

## ❓ 5. Troubleshooting & FAQs

| Issue | Solution |
| :---- | :------- |
| Backend server fails to start | Verify ports `5000` (HTTP) and `1935` (RTMP) are not occupied by another process. |
| Overriding default API keys | Create or edit `resources/.env` next to `app.asar` and restart the application. |
| Running on headless VPS | Use `./start-silent.sh` (Linux/macOS) or `start-silent.bat` (Windows) to run without a display. |
| Linux: *Permission denied* running `.sh` | The packaged build sets `chmod +x` automatically. If running from a manual extract, run `chmod +x *.sh AntStudio`. |
| Windows: Service won't start | Check `logs\stderr.log` for error details. Ensure `AntStudio.exe` is not blocked by antivirus. |
| macOS: App blocked by Gatekeeper | Run `xattr -cr /Applications/AntStudio.app` in Terminal and retry. |
| Root on Linux (Electron --no-sandbox) | `--no-sandbox` is automatically applied in all silent/headless launches (`install.sh`, `start-silent.sh`, and `main.cjs`). No manual action needed. |

