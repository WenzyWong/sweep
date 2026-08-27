# Sweep

A floating study countdown for macOS, modelled on the physical dial timer:
a colour sector sweeps back to zero, and the face flashes when time is up.

- Floats above every window, on every Space, including other apps' fullscreen Spaces
- Two looks: full body with its top buttons, or a bare dial for minimum distraction
- Six colourways from the reference timer, plus fully custom four-colour schemes
- Set the time by dragging the dial or by typing minutes (1–60)
- Every completed run is logged; the history window shows the day's rings and the last 30 days
- Traditional Chinese, Simplified Chinese, Japanese, English and French, picked up from the system locale on first launch

## Installing

Grab the `.dmg` for your Mac from the [Releases](../../releases) page —
`arm64` for Apple Silicon, `x64` for Intel — then drag Sweep into Applications.

The build is unsigned, so the first launch needs the quarantine flag cleared:

```sh
xattr -dr com.apple.quarantine "/Applications/Sweep.app"
```

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
| Reset | Click the round button on top |
| Move it | Drag the case or the dial's outer ring, or ⌘-drag anywhere |
| Everything else | Right-click: mode, size, colours, language, history, settings, quit |

The app has no Dock icon, so quit from the right-click menu (or ⌘Q while a
window is focused).

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
  chime.js           the end-of-timer bell, synthesised with Web Audio
  app.js             wiring: dragging, hit-testing, rendering, finishing
  settings.html/js   the settings window
  history.html/js    the history window
  panel.css          shared style for both auxiliary windows
tools/shot.js        dev-only: renders a page to a PNG for visual checks
```

Settings and history are JSON files in `~/Library/Application Support/Sweep/`.

## Packaging

```sh
npm run dist        # builds a .dmg into dist/
```

This writes `Sweep-<version>-arm64.dmg` and `Sweep-<version>-x64.dmg` into
`dist/`. Both are unsigned — see the quarantine note under Installing.
Signing and notarising properly needs a paid Apple Developer ID.
