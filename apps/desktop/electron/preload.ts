import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  startScreenCapture: () => ipcRenderer.send('capture:start'),
  onScreenCaptured: (callback: (imageBase64: string) => void) => {
    const handler = (_event: any, imageBase64: string) => callback(imageBase64);
    ipcRenderer.on('capture:completed', handler);
    return () => ipcRenderer.removeListener('capture:completed', handler);
  },
  onCaptureCancelled: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('capture:cancelled', handler);
    return () => ipcRenderer.removeListener('capture:cancelled', handler);
  },
  getBackendUrl: () => ipcRenderer.invoke('get:backend-url'),
  setBackendUrl: (url: string) => ipcRenderer.invoke('set:backend-url', url)
});
