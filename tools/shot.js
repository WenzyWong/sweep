const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--') && a.includes('='))
  .map(a => [a.slice(2, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]))

const page = args.page || 'index.html'
const out = args.out
const W = parseInt(args.w || '300', 10)
const H = parseInt(args.h || '340', 10)
const settings = args.stub

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: W, height: H, useContentSize: true, show: false,
    backgroundColor: page === 'index.html' ? '#8a8a8a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'shot-preload.js'),
      contextIsolation: true,
      additionalArguments: [`--stub=${settings}`, `--hist=${args.hist || '{}'}`]
    }
  })
  await win.loadFile(path.join(__dirname, '..', 'renderer', page))
  await new Promise(r => setTimeout(r, 900))
  if (args.js) {
    await win.webContents.executeJavaScript(Buffer.from(args.js, 'base64').toString('utf8'))
    await new Promise(r => setTimeout(r, 400))
  }
  const img = await win.webContents.capturePage()
  fs.writeFileSync(out, img.toPNG())
  app.quit()
})
