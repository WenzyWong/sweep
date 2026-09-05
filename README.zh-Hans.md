# Sweep

[繁體中文](README.md) · **简体中文** · [日本語](README.ja.md) · [English](README.en.md) · [Français](README.fr.md)

一款悬浮在 macOS 与 Windows 桌面上的学习倒计时器，以实体转盘计时器为原型：
彩色扇形一路扫回零点，时间到时盘面闪烁提醒。

![六种配色方案](docs/colourways.png)

- 置顶悬浮于所有窗口之上。macOS 上跨越所有桌面（Space），含全屏空间；Windows 没有对应能力，会留在打开时的那个虚拟桌面
- 两种外观：带顶部按钮的完整机身，或干扰最小的极简圆盘
- 六组取自实体计时器的预设配色，另可完全自定义四色方案
- 拨动盘面或直接输入分钟数（1–60）来设定时间
- 每次完成的倒计时都会记录；记录窗口显示当日的圆环与近 30 天概况
- 透明度可调，倒计时中与闲置时各自独立；鼠标移上去一律恢复全不透明
- 按键有咔嗒反馈，重置另有一声扫过的音，结束时轻响一声
- 繁体中文、简体中文、日文、英文、法文，首次启动时依系统语言自动选择

## 安装

到 [Releases](../../releases) 页面下载：

| 文件 | 适用 |
|---|---|
| `Sweep-<版本>-arm64.dmg` | Mac，Apple Silicon |
| `Sweep-<版本>-x64.dmg` | Mac，Intel |
| `Sweep-<版本>-win-x64.exe` | Windows 10/11，64 位 |

两个平台的安装包都未经签名，所以各自会拦一次。

**macOS**——把 Sweep 拖进「应用程序」，然后清除隔离标记：

```sh
xattr -dr com.apple.quarantine "/Applications/Sweep.app"
```

**Windows**——SmartScreen 会提示发行者无法识别。点「**更多信息**」→「**仍要运行**」。

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
| 重置 | 点击顶部的圆形按钮；极简圆盘模式下双击中央旋钮 |
| 移动窗口 | 拖拽机身或盘面外圈刻度区，或按住 ⌘／Ctrl 在任意处拖拽 |
| 其余功能 | 右键菜单：模式、尺寸、配色、语言、记录、设置、退出 |

本 App 不占用 Dock 也不进任务栏，因此请从右键菜单退出（或在窗口获得焦点时按 ⌘Q／Ctrl+Q）。

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

设置与记录是 JSON 文件：macOS 在 `~/Library/Application Support/Sweep/`，Windows 在 `%APPDATA%\Sweep\`。

## 打包

```sh
npm run dist        # macOS：两个 .dmg
npm run dist:win    # Windows：NSIS 安装程序
```

各平台的安装包只能在该平台上构建。GitHub Actions 会在每次推送 main 时两边都跑一次，
产物附在该次运行的 Artifacts 里。

所有安装包均未签名。macOS 要正式签名与公证需要付费的 Apple Developer ID，
Windows 要去除 SmartScreen 警告则需要代码签名证书。

## 致谢

本项目使用 [Claude Code](https://claude.com/claude-code) 协作开发。
