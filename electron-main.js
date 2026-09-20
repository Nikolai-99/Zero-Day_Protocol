const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Optimizar el rendimiento de la GPU y carga de sombreadores en Chromium
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('force-high-performance-gpu');
app.commandLine.appendSwitch('enable-features', 'CanvasOopRasterization');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow;
let splashWindow;

// Leer dev_mode.txt de forma segura y síncrona
function readDevMode() {
  try {
    const devModePath = path.join(__dirname, 'dev_mode.txt');
    if (fs.existsSync(devModePath)) {
      const content = fs.readFileSync(devModePath, 'utf8').trim().toLowerCase();
      return content === 'true';
    }
  } catch (e) {
    console.error('[ELECTRON] Error al leer dev_mode.txt:', e);
  }
  return false;
}

function createWindow() {
  const devMode = readDevMode();
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Removido clearCache() para conservar el cache HTTP y el cache de sombreadores WebGL en disco (Shader Disk Cache).

  // 1. Si devMode está inactivo (SILENCIOSO), crear ventana de carga (Splash)
  if (!devMode) {
    splashWindow = new BrowserWindow({
      width: 550,
      height: 350,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      icon: path.join(__dirname, 'assets', 'app_icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  }

  // 2. Crear la ventana principal del juego (no resizable por seguridad del canvas 3D)
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: "Zero-Day Protocol",
    resizable: false,
    show: devMode, // Mostrar de inmediato solo si está en modo desarrollo
    backgroundColor: '#080808',
    icon: path.join(__dirname, 'assets', 'app_icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true
  });

  // Alternar pantalla completa desde el frontend
  ipcMain.on('toggle-fullscreen', (event) => {
    if (mainWindow) {
      const isFull = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFull);
      mainWindow.webContents.send('fullscreen-changed', !isFull);
    }
  });

  // Atajo global Alt+Space capturado en el Proceso Principal (inmune a Pointer Lock)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.alt && (input.code === 'Space' || input.key === ' ') && input.type === 'keyDown') {
      event.preventDefault();
      if (mainWindow) {
        const isFull = mainWindow.isFullScreen();
        mainWindow.setFullScreen(!isFull);
        mainWindow.webContents.send('fullscreen-changed', !isFull);
      }
    }
  });

  // Cargar dev server o dist según corresponda
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    
    // Auto-retry si Vite está levantándose
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (validatedURL.startsWith('http://localhost:3000')) {
        console.log('[ELECTRON] El dev server de Vite no esta listo aun. Reintentando cargar en 1 segundo...');
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL('http://localhost:3000');
          }
        }, 1000);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Control de transicion desde Splash (IPC + ready-to-show)
  let isAppReady = false;
  let isWindowReady = false;
  let transitionTriggered = false;

  function triggerTransition() {
    if (transitionTriggered) return;
    transitionTriggered = true;
    
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  }

  ipcMain.once('app-ready', () => {
    isAppReady = true;
    if (isWindowReady || devMode) {
      triggerTransition();
    }
  });

  mainWindow.once('ready-to-show', () => {
    isWindowReady = true;
    
    if (devMode) {
      triggerTransition();
      mainWindow.webContents.openDevTools();
    } else {
      // Transicion fluida: Si el frontend ya precompilo los shaders, abrir de inmediato.
      // Si no, esperar a que termine, con un fallback de seguridad a los 1.5 segundos.
      if (isAppReady) {
        triggerTransition();
      } else {
        setTimeout(() => {
          triggerTransition();
        }, 4000);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
