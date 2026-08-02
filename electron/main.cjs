const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const dotenv = require('dotenv');
const { loadEncryptedEnv } = require('./crypto-env.cjs');

// Detect silent/headless mode from command line or environment variable
const isSilentMode = process.argv.includes('--silent') ||
                     process.argv.includes('--headless') ||
                     process.env.SILENT_MODE === 'true';

// Disable hardware acceleration to prevent GPU process crashes on incompatible hardware
// app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');
// app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

// When running in silent/headless mode on a Linux server (no X11 display),
// tell Chromium to use its built-in headless mode so it does not try to
// connect to an X server or Wayland compositor.
if (isSilentMode) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('headless');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  app.commandLine.appendSwitch('no-zygote');
  // app.commandLine.appendSwitch('single-process');
}

let mainWindow = null;

// Catch global uncaught errors and report via GUI dialog or console
process.on('uncaughtException', (err) => {
  console.error('[Electron] Uncaught Exception:', err);
  if (app.isReady() && !isSilentMode) {
    dialog.showErrorBox('AntStudio Application Error', err.stack || err.message);
  }
});

// Determine environment configuration
function loadEnvironment() {
  // 1. First, load encrypted default environment variables (.env.enc)
  const possibleEncPaths = [
    path.join(process.resourcesPath || '', '.env.enc'),
    path.join(path.dirname(app.getPath('exe')), '.env.enc'),
    path.join(process.cwd(), '.env.enc'),
    path.join(__dirname, '.env.enc'),
    path.join(__dirname, '..', '.env.enc')
  ];

  for (const encPath of possibleEncPaths) {
    if (fs.existsSync(encPath)) {
      loadEncryptedEnv(encPath);
      break;
    }
  }

  // 2. Next, load user's custom .env file (if present), overriding any default values
  const possibleEnvPaths = [
    path.join(process.cwd(), '.env'),
    path.join(path.dirname(app.getPath('exe')), '.env'),
    path.join(process.resourcesPath || '', '.env'),
    path.join(__dirname, '..', '.env')
  ];

  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`[Electron] Loading custom .env override from: ${envPath}`);
      dotenv.config({ path: envPath, override: true });
      process.env.ENV_FILE_PATH = envPath;
      break;
    }
  }
}

async function startBackendServer() {
  const PORT = process.env.PORT || 5000;
  const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

  console.log("[Electron] PORT: ", PORT);
  console.log("[Electron] BASE_URL: ", BASE_URL);

  // Set user data path for the in-process server
  process.env.APP_USER_DATA_PATH = app.getPath('userData');

  if (!app.isPackaged && process.env.VITE_DEV_SERVER_URL) {
    console.log('[Electron] Running in dev mode with external server.');
    return `http://localhost:${PORT}`;
  }

  try {
    console.log('[Electron] Starting backend server in-process...');
    process.env.PORT = PORT.toString();
    process.env.NODE_ENV = 'production';
    process.env.BASE_URL = BASE_URL;

    // Load compiled ESM server
    const serverPath = path.join(__dirname, '..', 'server', 'dist', 'index.js');

    if (fs.existsSync(serverPath)) {
      const fileUrl = pathToFileURL(serverPath).href;
      console.log(`[Electron] Dynamically importing ESM server: ${fileUrl}`);
      await import(fileUrl);
      console.log('[Electron] ESM backend server loaded successfully.');
    } else {
      console.warn(`[Electron] Backend server module not found at ${serverPath}.`);
    }
  } catch (err) {
    console.error('[Electron] Error starting backend server in-process:', err);
    if (app.isReady() && !isSilentMode) {
      dialog.showErrorBox('AntStudio Server Error', `Failed to start backend server:\n\n${err.stack || err.message}`);
    }
  }

  return `http://localhost:${PORT}`;
}

function createWindow(serverUrl) {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    title: 'AntStudio',
    icon: path.join(__dirname, '..', 'client', 'dist', 'icon.png'),
    webPreferences: {
      zoomFactor: 2.0,
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      webSecurity: false,
      autoHideMenuBar: true // Hides the menu bar until 'Alt' is pressed
    }
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || serverUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(serverUrl);
    mainWindow.setAutoHideMenuBar(true);
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`[Electron] Window failed to load: ${errorDescription} (${errorCode})`);
    setTimeout(() => {
      if (mainWindow) mainWindow.loadURL(serverUrl);
    }, 1000);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const { verifyEnvironment } = require('./env-verifier.cjs');

async function handleEnvironmentVerification() {
  try {
    const result = await verifyEnvironment();
    if (result.isValid) return true;

    const envPath = process.env.ENV_FILE_PATH || path.join(process.resourcesPath || '', '.env');
    const issueList = result.issues
      .map((item, idx) => `${idx + 1}. [${item.category}] ${item.field}\n   ➔ ${item.message}`)
      .join('\n\n');

    if (isSilentMode) {
      console.warn(`[Electron Silent Mode] Environment verification warning:\n${issueList}`);
      return true;
    }

    const messageText = `Detected unconfigured or invalid service connections:\n\n${issueList}\n\nPlease check and update your .env file at:\n${envPath}`;

    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      title: 'Environment Configuration Warning (AntStudio)',
      message: 'One or more service connections failed to verify!',
      detail: messageText,
      buttons: ['📂 Open .env Location', '⚠️ Ignore & Continue', '❌ Exit Application'],
      defaultId: 0,
      cancelId: 2
    });

    if (choice === 0) {
      if (fs.existsSync(envPath)) {
        shell.showItemInFolder(envPath);
      } else {
        const dirPath = path.dirname(envPath);
        if (fs.existsSync(dirPath)) {
          shell.openPath(dirPath);
        } else {
          dialog.showErrorBox('Error', `Could not find .env file at: ${envPath}`);
        }
      }
      const postChoice = dialog.showMessageBoxSync({
        type: 'question',
        title: 'Launch Confirmation',
        message: 'Opened .env location.',
        detail: 'Please update your environment variables, then click Continue to launch the application.',
        buttons: ['▶️ Continue Launch', '❌ Exit Application'],
        defaultId: 0,
        cancelId: 1
      });
      if (postChoice === 1) {
        app.quit();
        process.exit(0);
      }
    } else if (choice === 2) {
      app.quit();
      process.exit(0);
    }
  } catch (err) {
    console.error('[Electron] Error during environment verification:', err);
  }
  return true;
}

app.whenReady().then(async () => {
  loadEnvironment();
  await handleEnvironmentVerification();

  const serverUrl = await startBackendServer();

  if (isSilentMode) {
    console.log('----------------------------------------------------');
    console.log('🚀 [AntStudio] Running in Silent / Headless Mode (No Window)');
    console.log(`🌐 Backend Server URL: ${serverUrl}`);
    console.log('----------------------------------------------------');
  } else {
    createWindow(serverUrl);
  }

  app.on('activate', () => {
    if (!isSilentMode && BrowserWindow.getAllWindows().length === 0) {
      createWindow(serverUrl);
    }
  });
});

app.on('window-all-closed', () => {
  if (isSilentMode) return;
  if (process.platform !== 'darwin') {
    app.quit();
    process.exit(0);
  }
});

app.on('will-quit', () => {
  process.exit(0);
});
