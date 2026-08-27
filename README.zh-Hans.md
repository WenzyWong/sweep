# Sweep

[繁體中文](README.md) · **简体中文** · [日本語](README.ja.md) · [English](README.en.md) · [Français](README.fr.md)

一款悬浮在 macOS 桌面上的学习倒计时器，以实体转盘计时器为原型：
彩色扇形一路扫回零点，时间到时盘面闪烁提醒。

![六种配色方案](docs/colourways.png)

- 置顶悬浮于所有窗口之上，跨越所有桌面（Space），包含其他 App 的全屏空间
- 两种外观：带顶部按钮的完整机身，或干扰最小的极简圆盘
- 六组取自实体计时器的预设配色，另可完全自定义四色方案
- 拨动盘面或直接输入分钟数（1–60）来设定时间
- 每次完成的倒计时都会记录；记录窗口显示当日的圆环与近 30 天概况
- 繁体中文、简体中文、日文、英文、法文，首次启动时依系统语言自动选择

## 安装

到 [Releases](../../releases) 页面下载对应机型的 `.dmg`——Apple Silicon 选 `arm64`，
Intel 选 `x64`——然后把 Sweep 拖进「应用程序」。

安装包未经 Apple 签名，首次打开前需要清除隔离标记：

```sh
xattr -dr com.apple.quarantine "/Applications/Sweep.app"
```

## 从源码运行

```sh
npm install
npm start
```

## 操作方式

| 动作 | 方法 |
|---|---|
| 设定时间 | 在盘面内拖拽——顺时针增加，逆时针减少 |
| 输入时间 | 双击盘面，输入 1–60，按 Enter |
| 开始 / 暂停 | 点击中央旋钮，或顶部的长条按钮 |
| 重置 | 点击顶部的圆形按钮 |
| 移动窗口 | 拖拽机身或盘面外圈刻度区，或按住 ⌘ 在任意处拖拽 |
| 其余功能 | 右键菜单：模式、尺寸、配色、语言、记录、设置、退出 |

本 App 不占用 Dock 图标，因此请从右键菜单退出（或在窗口获得焦点时按 ⌘Q）。

## 项目结构

```
main.js              窗口、悬浮行为、菜单、数据存储、系统通知
preload.js           以 window.api 形式暴露给页面的 IPC 桥接
renderer/
  index.html         计时器本体
  style.css          外观样式；所有颜色都由四个 CSS 变量驱动
  schemes.js         六组预设配色与颜色工具函数（与主进程共用）
  i18n.js            五本语言字典与 DOM 翻译器（与主进程共用）
  dial.js            盘面几何：刻度、数字、扇形路径、拖拽角度运算
  timer.js           倒计时状态机
  chime.js           提示音与按键音效，以 Web Audio 实时合成
  app.js             整合层：拖拽、命中测试、绘制、结束处理
  settings.html/js   设置窗口
  history.html/js    记录窗口
  panel.css          两个辅助窗口共用的样式
tools/shot.js        开发用：把页面渲染成 PNG 以便视觉检查
```

设置与记录是存放在 `~/Library/Application Support/Sweep/` 的 JSON 文件。

## 打包

```sh
npm run dist        # 在 dist/ 产出 .dmg
```

会在 `dist/` 生成 `Sweep-<版本>-arm64.dmg` 与 `Sweep-<版本>-x64.dmg`。
两者均未签名——参见「安装」一节的隔离标记说明。
要正式签名与公证需要付费的 Apple Developer ID。
