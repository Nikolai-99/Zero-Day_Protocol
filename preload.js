const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script de Electron
 * Expone de forma segura APIs del proceso principal al proceso de renderizado
 * sin habilitar nodeIntegration completo en el navegador.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  toggleFullScreen: () => ipcRenderer.send('toggle-fullscreen'),
  onFullScreenChanged: (callback) => {
    const subscription = (event, isFull) => callback(isFull);
    ipcRenderer.on('fullscreen-changed', subscription);
    return () => {
      ipcRenderer.removeListener('fullscreen-changed', subscription);
    };
  },
  appReady: () => ipcRenderer.send('app-ready')
});
