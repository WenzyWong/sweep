const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: patch => ipcRenderer.invoke('settings:set', patch),
  onSettingsChanged: cb => ipcRenderer.on('settings:changed', (_e, s) => cb(s)),

  getHistory: () => ipcRenderer.invoke('history:get'),
  addSession: minutes => ipcRenderer.invoke('history:add', { minutes }),
  onHistoryChanged: cb => ipcRenderer.on('history:changed', (_e, h) => cb(h)),

  runStarted: (endAt, minutes) => ipcRenderer.send('run:started', { endAt, minutes }),
  runCleared: () => ipcRenderer.send('run:cleared'),
  getRecoverable: () => ipcRenderer.invoke('run:recoverable'),
  recover: accept => ipcRenderer.invoke('run:recover', accept),

  moveBy: (dx, dy) => ipcRenderer.send('window:move-by', dx, dy),
  setIgnoreMouse: ignore => ipcRenderer.send('window:ignore-mouse', ignore),
  raise: () => ipcRenderer.send('window:raise'),

  showMenu: () => ipcRenderer.send('menu:show'),
  openSettings: () => ipcRenderer.send('settings:open'),
  openHistory: () => ipcRenderer.send('history:open'),
  notify: minutes => ipcRenderer.send('notify', { minutes }),
  quit: () => ipcRenderer.send('app:quit')
})
