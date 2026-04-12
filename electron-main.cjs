const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Global reference of the window object
let mainWindow;
let serverProcess;
const PORT = 3001; // Specific port for desktop app

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Forge - AI Social Media',
    icon: path.join(__dirname, 'public', 'logo.png'), // Fallback if logo.png exists
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset', // premium look for macOS
    autoHideMenuBar: true, // cleaner look for Windows
  });

  // Load the backend server URL
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startBackend() {
  console.log('Starting backend server...');
  
  // We use the bundled server.js in production or server.ts via tsx in dev
  // For simplicity in the EXE, we assume dist/server.js exists (built via npm run build)
  const serverPath = path.join(__dirname, 'dist', 'server.js');
  
  // Start the server as a background process
  // We use the same executable (process.execPath) for consistency
  serverProcess = spawn(process.execPath, [serverPath], {
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      PORT: PORT.toString(),
      ELECTRON_RUN_AS_NODE: '1' // Tell Electron to act as a Node process
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  // Wait for server to be ready before creating window
  const checkServer = () => {
    http.get(`http://localhost:${PORT}`, (res) => {
      createWindow();
    }).on('error', () => {
      setTimeout(checkServer, 500);
    });
  };

  checkServer();
}

app.on('ready', startBackend);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
