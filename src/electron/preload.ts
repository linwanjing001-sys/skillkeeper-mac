import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('skillkeeper', {
  scanSkills: () => ipcRenderer.invoke('skills:scan'),
  openPath: (path: string) => ipcRenderer.invoke('path:open', path),
  revealPath: (path: string) => ipcRenderer.invoke('path:reveal', path),
  copyText: (text: string) => ipcRenderer.invoke('clipboard:copy-text', text),
  trashSkills: (items: Array<{ id: string; name: string; folderPath: string }>) =>
    ipcRenderer.invoke('skills:trash', items)
});
