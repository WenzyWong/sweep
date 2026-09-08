// Dev-only stub of the real preload, so a renderer page can be screenshotted
// without the full main process behind it.
const { contextBridge, ipcRenderer } = require('electron')
const settings = JSON.parse(process.argv.find(a => a.startsWith('--stub=')).slice(7))

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  getSettings: async () => settings,
  setSettings: async () => settings,
  onSettingsChanged: () => {},
  getHistory: async () => JSON.parse(process.argv.find(a => a.startsWith('--hist=')).slice(7)),
  addSession: async () => {},
  onHistoryChanged: () => {},
  runStarted: () => {}, runCleared: () => {},
  getRecoverable: async () => {
    const a = process.argv.find(x => x.startsWith('--recover='))
    return a ? JSON.parse(a.slice(10)) : null
  },
  recover: async () => {},
  moveBy: () => {}, setIgnoreMouse: () => {}, raise: () => {},
  showMenu: () => {}, openSettings: () => {}, openHistory: () => {},
  notify: () => {}, quit: () => {}
})
