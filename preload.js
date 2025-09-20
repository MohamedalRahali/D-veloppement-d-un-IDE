const { contextBridge, ipcRenderer } = require('electron');

console.log('=== PRELOAD SCRIPT STARTING ===');

// Test simple immédiat
try {
  console.log('contextBridge available:', !!contextBridge);
  console.log('ipcRenderer available:', !!ipcRenderer);
  
  // Exposer une API minimale
  contextBridge.exposeInMainWorld('api', {
    test: () => 'Hello from preload!',
    getDirectoryTree: (rootPath) => ipcRenderer.invoke('get-directory-tree', rootPath),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    createFile: (filePath, content = '') => ipcRenderer.invoke('create-file', filePath, content),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
    createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
    deleteDirectory: (dirPath) => ipcRenderer.invoke('delete-directory', dirPath),
    renamePath: (oldPath, newPath) => ipcRenderer.invoke('rename-path', oldPath, newPath),
    readClipboardText: () => ipcRenderer.invoke('read-clipboard-text'),
    writeClipboardText: (text) => ipcRenderer.invoke('write-clipboard-text', text),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    logEvent: (logData) => ipcRenderer.invoke('log-event', logData)
  });
  
  console.log('✅ API exposed successfully');
  console.log('=== PRELOAD SCRIPT COMPLETE ===');
} catch (error) {
  console.error('❌ Error in preload script:', error);
}