const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    saveBackupNative: (defaultName, content) => ipcRenderer.invoke('save-backup-native', { defaultName, content }),
    openBackupFolder: () => ipcRenderer.invoke('open-backup-folder')
});
