# Sweep

**繁體中文** · [简体中文](README.zh-Hans.md) · [日本語](README.ja.md) · [English](README.en.md) · [Français](README.fr.md)

一款懸浮在 macOS 與 Windows 桌面上的讀書倒數計時器，以實體轉盤計時器為原型：
彩色扇形一路掃回零點，時間到時盤面閃爍提醒。

![六種配色方案](docs/colourways.png)

- 置頂懸浮於所有視窗之上。macOS 上跨越所有桌面（Space），含全螢幕空間；Windows 沒有對應能力，會留在開啟時的那個虛擬桌面
- 兩種外觀：帶頂部按鈕的完整機身，或干擾最小的極簡圓盤
- 六組取自實體計時器的預設配色，另可完全自訂四色方案
- 撥動盤面或直接輸入分鐘數（1–60）來設定時間
- 每次完成的倒數都會記錄；紀錄視窗顯示當日的圓環與近 30 天概況
- 透明度可調，倒數中與閒置時各自獨立；滑鼠移上去一律恢復全不透明
- 按鍵有咔嗒回饋，重置另有一聲掃過的音，結束時輕響一聲
- 繁體中文、簡體中文、日文、英文、法文，首次啟動時依系統語系自動選擇

## 安裝

到 [Releases](../../releases) 頁面下載：

| 檔案 | 適用 |
|---|---|
| `Sweep-<版本>-arm64.dmg` | Mac，Apple Silicon |
| `Sweep-<版本>-x64.dmg` | Mac，Intel |
| `Sweep-<版本>-win-x64.exe` | Windows 10/11，64 位元 |

兩個平台的安裝檔都未經簽名，所以各自會攔一次。

**macOS**——把 Sweep 拖進「應用程式」，然後清除隔離標記：

```sh
xattr -dr com.apple.quarantine "/Applications/Sweep.app"
```

**Windows**——SmartScreen 會提示發行者無法辨識。點「**其他資訊**」→「**仍要執行**」。

## 從原始碼執行

```sh
npm install
npm start
```

## 操作方式

| 動作 | 方法 |
|---|---|
| 設定時間 | 在盤面內拖曳——順時針增加，逆時針減少 |
| 輸入時間 | 雙擊盤面，輸入 1–60，按 Enter |
| 開始 / 暫停 | 點擊中央旋鈕，或頂部的長條按鈕 |
| 重置 | 點擊頂部的圓形按鈕；極簡圓盤模式下雙擊中央旋鈕 |
| 移動視窗 | 拖曳機身或盤面外圈刻度區，或按住 ⌘／Ctrl 在任意處拖曳 |
| 其餘功能 | 右鍵選單：模式、尺寸、配色、語言、紀錄、設定、結束 |

本 App 不佔用 Dock 也不進工作列，因此請從右鍵選單結束（或在視窗獲得焦點時按 ⌘Q／Ctrl+Q）。

## 專案結構

```
main.js              視窗、懸浮行為、選單、資料儲存、系統通知
preload.js           以 window.api 形式暴露給頁面的 IPC 橋接
renderer/
  index.html         計時器本體
  style.css          外觀樣式；所有顏色都由四個 CSS 變數驅動
  schemes.js         六組預設配色與顏色工具函式（與主行程共用）
  i18n.js            五本語言字典與 DOM 翻譯器（與主行程共用）
  dial.js            盤面幾何：刻度、數字、扇形路徑、拖曳角度運算
  timer.js           倒數狀態機
  chime.js           提示音與按鍵音效，以 Web Audio 即時合成
  app.js             整合層：拖曳、命中測試、繪製、結束處理
  settings.html/js   設定視窗
  history.html/js    紀錄視窗
  panel.css          兩個輔助視窗共用的樣式
tools/shot.js        開發用：把頁面渲染成 PNG 以便視覺檢查
```

設定與紀錄是 JSON 檔案：macOS 在 `~/Library/Application Support/Sweep/`，Windows 在 `%APPDATA%\Sweep\`。

## 打包

```sh
npm run dist        # macOS：兩個 .dmg
npm run dist:win    # Windows：NSIS 安裝程式
```

各平台的安裝檔只能在該平台上建置。GitHub Actions 會在每次推送 main 時兩邊都跑一次，
產物附在該次執行的 Artifacts 裡。

所有安裝檔皆未簽名。macOS 要正式簽名與公證需要付費的 Apple Developer ID，
Windows 要去除 SmartScreen 警告則需要程式碼簽章憑證。

## 致謝

本專案使用 [Claude Code](https://claude.com/claude-code) 協作開發。
