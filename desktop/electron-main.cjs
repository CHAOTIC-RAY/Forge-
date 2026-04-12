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
    icon: path.join(__dirname, '..', 'public', 'logo.png'), 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
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
  
  // Point to the root dist folder
  const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
  
  serverProcess = spawn(process.execPath, [serverPath], {
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      PORT: PORT.toString(),
      ELECTRON_RUN_AS_NODE: '1'
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

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
