import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  desktopCapturer,
  nativeImage
} from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let capturedScreenSource: any = null;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
let backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3001';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#090d16',
    title: 'Everything Wishlist',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools if needed
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function triggerScreenCapture() {
  if (overlayWindow) return; // already in capture mode

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;
  const scaleFactor = primaryDisplay.scaleFactor || 1;

  // Temporarily minimize/hide main window so it's not captured
  if (mainWindow && !mainWindow.isMinimized()) {
    mainWindow.hide();
  }

  // Small delay to allow window to hide
  await new Promise((resolve) => setTimeout(resolve, 200));

  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(width * scaleFactor),
        height: Math.round(height * scaleFactor)
      }
    });

    const source = sources[0];
    if (!source) {
      console.error('No display source found for capture.');
      if (mainWindow) mainWindow.show();
      return;
    }

    capturedScreenSource = source.thumbnail;

    overlayWindow = new BrowserWindow({
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      width: primaryDisplay.bounds.width,
      height: primaryDisplay.bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      fullscreen: true,
      enableLargerThanScreen: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const overlayPath = fs.existsSync(path.join(__dirname, 'overlay.html'))
      ? path.join(__dirname, 'overlay.html')
      : path.join(__dirname, '../electron/overlay.html');
    overlayWindow.loadFile(overlayPath);

    overlayWindow.on('closed', () => {
      overlayWindow = null;
    });
  } catch (err) {
    console.error('Failed to initiate screen capture:', err);
    if (mainWindow) mainWindow.show();
  }
}

// IPC Handlers
ipcMain.on('capture:start', () => {
  triggerScreenCapture();
});

ipcMain.on('snip:cancel', () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('capture:cancelled');
  }
});

ipcMain.on('snip:selected', (_event, rect: { x: number; y: number; width: number; height: number }) => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const scale = primaryDisplay.scaleFactor || 1;

  if (capturedScreenSource) {
    try {
      const cropped = capturedScreenSource.crop({
        x: Math.round(rect.x * scale),
        y: Math.round(rect.y * scale),
        width: Math.round(rect.width * scale),
        height: Math.round(rect.height * scale)
      });

      const base64Image = cropped.toDataURL();

      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('capture:completed', base64Image);
      }
    } catch (err) {
      console.error('Error cropping image:', err);
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  }
});

ipcMain.handle('get:backend-url', () => backendUrl);
ipcMain.handle('set:backend-url', (_event, url: string) => {
  backendUrl = url;
  return backendUrl;
});

app.whenReady().then(() => {
  createMainWindow();

  // Register Global Keyboard Shortcut (CommandOrControl+Shift+S)
  const registered = globalShortcut.register('CommandOrControl+Shift+S', () => {
    triggerScreenCapture();
  });

  if (!registered) {
    console.warn('Global shortcut registration failed. Trying Alt+Shift+W as alternate.');
    globalShortcut.register('Alt+Shift+W', () => {
      triggerScreenCapture();
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
