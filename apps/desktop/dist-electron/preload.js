"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    startScreenCapture: () => electron_1.ipcRenderer.send('capture:start'),
    onScreenCaptured: (callback) => {
        const handler = (_event, imageBase64) => callback(imageBase64);
        electron_1.ipcRenderer.on('capture:completed', handler);
        return () => electron_1.ipcRenderer.removeListener('capture:completed', handler);
    },
    onCaptureCancelled: (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on('capture:cancelled', handler);
        return () => electron_1.ipcRenderer.removeListener('capture:cancelled', handler);
    },
    getBackendUrl: () => electron_1.ipcRenderer.invoke('get:backend-url'),
    setBackendUrl: (url) => electron_1.ipcRenderer.invoke('set:backend-url', url)
});
