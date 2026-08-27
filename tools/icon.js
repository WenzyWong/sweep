// Renders tools/icon.html at 1024x1024 with a transparent background.
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024, height: 1024, useContentSize: true, show: false,
    transparent: true, frame: false, backgroundColor: '#00000000',
    webPreferences: { offscreen: false }
  })
  await win.loadFile(path.join(__dirname, 'icon.html'))
  await new Promise(r => setTimeout(r, 800))
  const img = await win.webContents.capturePage()
  fs.writeFileSync(process.argv[2] || path.join(__dirname, '..', 'build', 'icon.png'), img.toPNG())
  app.quit()
})
