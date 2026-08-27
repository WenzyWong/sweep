// Dev-only stub of the real preload, so a renderer page can be screenshotted
// without the full main process behind it.
const { contextBridge, ipcRenderer } = require('electron')
const settings = JSON.parse(process.argv.find(a => a.startsWith('--stub=')).slice(7))

contextBridge.exposeInMainWorld('api', {
  getSettings: async () => settings,
  setSettings: async () => settings,
  onSettingsChanged: () => {},
  getHistory: async () => JSON.parse(process.argv.find(a => a.startsWith('--hist=')).slice(7)),
  addSession: async () => {},
  onHistoryChanged: () => {},
  moveBy: () => {}, setIgnoreMouse: () => {}, raise: () => {},
  showMenu: () => {}, openSettings: () => {}, openHistory: () => {},
  notify: () => {}, quit: () => {}
})
