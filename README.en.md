# Sweep

[繁體中文](README.md) · [简体中文](README.zh-Hans.md) · [日本語](README.ja.md) · **English** · [Français](README.fr.md)

A floating study countdown for macOS and Windows, modelled on the physical dial timer:
a colour sector sweeps back to zero, and the face flashes when time is up.

![The six colourways](docs/colourways.png)

- Floats above every window. On macOS that extends to every Space, fullscreen ones included; Windows has no equivalent, so it stays on the desktop it was opened on
- Two looks: full body with its top buttons, or a bare dial for minimum distraction
- Six colourways from the reference timer, plus fully custom four-colour schemes
- Set the time by dragging the dial or by typing minutes (1–60)
- Every completed run is logged; the history window shows the day's rings and the last 30 days
- Adjustable opacity, set separately for running and idle; hovering always brings it back to solid
- Buttons click, reset sweeps, and a soft note marks the end
- Traditional Chinese, Simplified Chinese, Japanese, English and French, picked up from the system locale on first launch

## Installing

From the [Releases](../../releases) page:

| File | For |
|---|---|
| `Sweep-<version>-arm64.dmg` | Mac, Apple Silicon |
| `Sweep-<version>-x64.dmg` | Mac, Intel |
| `Sweep-<version>-win-x64.exe` | Windows 10/11, 64-bit |

Neither build is signed, so each system objects once.

**macOS** — drag Sweep into Applications, then clear the quarantine flag:

```sh
xattr -dr com.apple.quarantine "/Applications/Sweep.app"
```

**Windows** — SmartScreen warns about an unrecognised publisher. Choose
**More info**, then **Run anyway**.

## Running it from source

```sh
npm install
npm start
```

## Using it

| Action | How |
|---|---|
| Set the time | Drag inside the dial — clockwise adds, anticlockwise subtracts |
| Type a time | Double-click the dial, enter 1–60, press Enter |
| Start / pause | Click the centre knob, or the bar button on top |
| Reset | Click the round button on top; in bare-dial mode, double-click the centre knob |
| Move it | Drag the case or the dial's outer ring, or ⌘/Ctrl-drag anywhere |
| Everything else | Right-click: mode, size, colours, language, history, settings, quit |

The app stays out of the Dock and the taskbar, so quit from the right-click
menu (or ⌘Q / Ctrl+Q while a window is focused).

## Where things live

```
main.js              window, floating behaviour, menu, storage, notifications
preload.js           the IPC bridge exposed to the pages as window.api
renderer/
  index.html         the timer widget
  style.css          the widget's look; all colour comes from four CSS variables
  schemes.js         the six preset colourways and colour helpers (shared with the main process)
  i18n.js            the five dictionaries and the DOM translator (shared with the main process)
  dial.js            dial geometry: ticks, numbers, the sector path, drag angles
  timer.js           countdown state machine
  chime.js           the bell and the button sounds, synthesised with Web Audio
  app.js             wiring: dragging, hit-testing, rendering, finishing
  settings.html/js   the settings window
  history.html/js    the history window
  panel.css          shared style for both auxiliary windows
tools/shot.js        dev-only: renders a page to a PNG for visual checks
```

Settings and history are JSON files, in `~/Library/Application Support/Sweep/` on macOS and `%APPDATA%\Sweep\` on Windows.

## Packaging

```sh
npm run dist        # macOS: two .dmg
npm run dist:win    # Windows: an NSIS installer
```

Each installer can only be built on its own platform. GitHub Actions runs both
on every push to main and attaches them to the run's artifacts.

Nothing is signed. Notarising on macOS needs a paid Apple Developer ID, and
silencing SmartScreen on Windows needs a code-signing certificate.

## Credits

Built with [Claude Code](https://claude.com/claude-code).
