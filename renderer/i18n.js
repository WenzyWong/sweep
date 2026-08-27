// Shared by the main process and every renderer page.
const LANGS = [
  { id: 'zh-Hant', name: '繁體中文', locale: 'zh-TW' },
  { id: 'zh-Hans', name: '简体中文', locale: 'zh-CN' },
  { id: 'ja',      name: '日本語',    locale: 'ja' },
  { id: 'en',      name: 'English',  locale: 'en' },
  { id: 'fr',      name: 'Français', locale: 'fr' }
]

const STRINGS = {
  'zh-Hant': {
    'app.name': 'Sweep',
    'win.settings': 'Sweep — 設定',
    'win.history': 'Sweep — 紀錄',

    'btn.start': '開始', 'btn.pause': '暫停', 'btn.reset': '重置',
    'tip.startPause': '開始 / 暫停', 'tip.reset': '重置',
    'again': '↻ 再 {m} 分鐘',

    'notify.title': '倒數結束',
    'notify.body': '{m} 分鐘的專注完成了',

    'menu.toDial': '切換為極簡圓盤', 'menu.toFull': '切換為完整機身',
    'menu.size': '尺寸', 'menu.colors': '配色', 'menu.language': '語言',
    'menu.history': '今日紀錄…', 'menu.settings': '設定…', 'menu.quit': '結束 Sweep',
    'size.small': '小', 'size.medium': '中', 'size.large': '大', 'size.xlarge': '特大',
    'menu.edit': '編輯',

    'settings.title': '設定',
    'sec.schemes': '配色方案', 'sec.custom': '自訂配色', 'sec.appearance': '外觀',
    'sec.faceText': '盤面文字', 'sec.alert': '結束提醒', 'sec.language': '語言',
    'color.body': '機身', 'color.sector': '扇區', 'color.knob': '旋鈕', 'color.btn': '頂部按鈕',
    'scheme.name': '配色名稱', 'scheme.save': '儲存為新配色',
    'scheme.defaultName': '我的配色', 'scheme.delete': '刪除',
    'contrast.warn': '扇區色與盤面底色的對比只有 {r}:1，倒數時扇形可能看不清楚。建議把扇區色調深一些。',
    'appearance.mode': '顯示模式', 'mode.full': '完整機身', 'mode.dial': '極簡圓盤',
    'appearance.size': '尺寸',
    'appearance.idleFade': '閒置時淡出',
    'appearance.idleFadeHint': '沒在倒數時自動變淡，滑鼠移上去恢復',
    'appearance.opacity': '整體透明度', 'appearance.opacityHint': '倒數進行中的不透明度',
    'appearance.idleOpacity': '閒置透明度', 'appearance.idleOpacityHint': '閒置時的不透明度；滑鼠移上去一律恢復全不透明',
    'text.quote': '箴言', 'text.label': '標籤', 'text.labelHint': '機身左上角的小字',
    'alert.sound': '提示音', 'alert.soundHint': '結束時輕響一聲',
    'alert.click': '按鍵音', 'alert.clickHint': '按下按鈕時的咔嗒聲，重置另有一聲掃過的音',
    'alert.notify': '系統通知', 'alert.notifyHint': '被全螢幕視窗蓋住時也看得到',
    'open.history': '開啟紀錄視窗',

    'nav.prev': '前一天', 'nav.next': '後一天', 'nav.today': '今天',
    'summary': '{n} 次專注　·　共 {m} 分鐘',
    'empty.1': '這天還沒有完成的倒數。', 'empty.2': '走完一輪就會在這裡留下一枚圓環。',
    'heat.title': '近 30 天',
    'unit.min': '{m} 分鐘'
  },

  'zh-Hans': {
    'app.name': 'Sweep',
    'win.settings': 'Sweep — 设置',
    'win.history': 'Sweep — 记录',

    'btn.start': '开始', 'btn.pause': '暂停', 'btn.reset': '重置',
    'tip.startPause': '开始 / 暂停', 'tip.reset': '重置',
    'again': '↻ 再 {m} 分钟',

    'notify.title': '倒计时结束',
    'notify.body': '{m} 分钟的专注完成了',

    'menu.toDial': '切换为极简圆盘', 'menu.toFull': '切换为完整机身',
    'menu.size': '尺寸', 'menu.colors': '配色', 'menu.language': '语言',
    'menu.history': '今日记录…', 'menu.settings': '设置…', 'menu.quit': '退出 Sweep',
    'size.small': '小', 'size.medium': '中', 'size.large': '大', 'size.xlarge': '特大',
    'menu.edit': '编辑',

    'settings.title': '设置',
    'sec.schemes': '配色方案', 'sec.custom': '自定义配色', 'sec.appearance': '外观',
    'sec.faceText': '盘面文字', 'sec.alert': '结束提醒', 'sec.language': '语言',
    'color.body': '机身', 'color.sector': '扇区', 'color.knob': '旋钮', 'color.btn': '顶部按钮',
    'scheme.name': '配色名称', 'scheme.save': '保存为新配色',
    'scheme.defaultName': '我的配色', 'scheme.delete': '删除',
    'contrast.warn': '扇区色与盘面底色的对比只有 {r}:1，倒计时时扇形可能看不清楚。建议把扇区色调深一些。',
    'appearance.mode': '显示模式', 'mode.full': '完整机身', 'mode.dial': '极简圆盘',
    'appearance.size': '尺寸',
    'appearance.idleFade': '闲置时淡出',
    'appearance.idleFadeHint': '没在倒计时时自动变淡，鼠标移上去恢复',
    'appearance.opacity': '整体透明度', 'appearance.opacityHint': '倒计时进行中的不透明度',
    'appearance.idleOpacity': '闲置透明度', 'appearance.idleOpacityHint': '闲置时的不透明度；鼠标移上去一律恢复全不透明',
    'text.quote': '箴言', 'text.label': '标签', 'text.labelHint': '机身左上角的小字',
    'alert.sound': '提示音', 'alert.soundHint': '结束时轻响一声',
    'alert.click': '按键音', 'alert.clickHint': '按下按钮时的咔嗒声，重置另有一声扫过的音',
    'alert.notify': '系统通知', 'alert.notifyHint': '被全屏窗口盖住时也看得到',
    'open.history': '打开记录窗口',

    'nav.prev': '前一天', 'nav.next': '后一天', 'nav.today': '今天',
    'summary': '{n} 次专注　·　共 {m} 分钟',
    'empty.1': '这天还没有完成的倒计时。', 'empty.2': '走完一轮就会在这里留下一枚圆环。',
    'heat.title': '近 30 天',
    'unit.min': '{m} 分钟'
  },

  ja: {
    'app.name': 'Sweep',
    'win.settings': 'Sweep — 設定',
    'win.history': 'Sweep — 記録',

    'btn.start': '開始', 'btn.pause': '一時停止', 'btn.reset': 'リセット',
    'tip.startPause': '開始 / 一時停止', 'tip.reset': 'リセット',
    'again': '↻ もう {m} 分',

    'notify.title': '時間になりました',
    'notify.body': '{m} 分の集中が完了しました',

    'menu.toDial': 'ダイヤルのみに切り替え', 'menu.toFull': '本体表示に切り替え',
    'menu.size': 'サイズ', 'menu.colors': 'カラー', 'menu.language': '言語',
    'menu.history': '記録…', 'menu.settings': '設定…', 'menu.quit': 'Sweep を終了',
    'size.small': '小', 'size.medium': '中', 'size.large': '大', 'size.xlarge': '特大',
    'menu.edit': '編集',

    'settings.title': '設定',
    'sec.schemes': 'カラーパターン', 'sec.custom': 'カスタムカラー', 'sec.appearance': '外観',
    'sec.faceText': '文字盤のテキスト', 'sec.alert': '終了時の通知', 'sec.language': '言語',
    'color.body': '本体', 'color.sector': '扇形', 'color.knob': 'つまみ', 'color.btn': '上部ボタン',
    'scheme.name': 'カラー名', 'scheme.save': '新規保存',
    'scheme.defaultName': 'マイカラー', 'scheme.delete': '削除',
    'contrast.warn': '扇形と文字盤のコントラストが {r}:1 しかありません。カウントダウン中に扇形が見えにくくなる可能性があります。扇形の色をもう少し濃くしてください。',
    'appearance.mode': '表示モード', 'mode.full': '本体表示', 'mode.dial': 'ダイヤルのみ',
    'appearance.size': 'サイズ',
    'appearance.idleFade': '待機中は薄くする',
    'appearance.idleFadeHint': 'カウントダウンしていないときは薄くなり、マウスを重ねると元に戻ります',
    'appearance.opacity': '全体の不透明度', 'appearance.opacityHint': 'カウントダウン中の不透明度',
    'appearance.idleOpacity': '待機時の不透明度', 'appearance.idleOpacityHint': '待機中の不透明度。マウスを重ねると必ず完全な不透明に戻ります',
    'text.quote': '一言', 'text.label': 'ラベル', 'text.labelHint': '本体左上の小さな文字',
    'alert.sound': '通知音', 'alert.soundHint': '終了時に一度だけ柔らかく鳴ります',
    'alert.click': 'ボタン音', 'alert.clickHint': 'ボタンを押したときのカチッという音。リセットだけは払うような音になります',
    'alert.notify': 'システム通知', 'alert.notifyHint': '全画面ウインドウに隠れていても届きます',
    'open.history': '記録ウインドウを開く',

    'nav.prev': '前の日', 'nav.next': '次の日', 'nav.today': '今日',
    'summary': '{n} 回の集中　·　合計 {m} 分',
    'empty.1': 'この日はまだ完了したカウントダウンがありません。', 'empty.2': '一巡すると、ここにリングが残ります。',
    'heat.title': '直近 30 日',
    'unit.min': '{m} 分'
  },

  en: {
    'app.name': 'Sweep',
    'win.settings': 'Sweep — Settings',
    'win.history': 'Sweep — History',

    'btn.start': 'START', 'btn.pause': 'PAUSE', 'btn.reset': 'RESET',
    'tip.startPause': 'Start / pause', 'tip.reset': 'Reset',
    'again': '↻ Another {m} min',

    'notify.title': "Time's up",
    'notify.body': '{m} minutes of focus, done.',

    'menu.toDial': 'Switch to bare dial', 'menu.toFull': 'Switch to full body',
    'menu.size': 'Size', 'menu.colors': 'Colours', 'menu.language': 'Language',
    'menu.history': 'History…', 'menu.settings': 'Settings…', 'menu.quit': 'Quit Sweep',
    'size.small': 'Small', 'size.medium': 'Medium', 'size.large': 'Large', 'size.xlarge': 'Extra large',
    'menu.edit': 'Edit',

    'settings.title': 'Settings',
    'sec.schemes': 'Colourways', 'sec.custom': 'Custom colours', 'sec.appearance': 'Appearance',
    'sec.faceText': 'Dial text', 'sec.alert': 'When time is up', 'sec.language': 'Language',
    'color.body': 'Case', 'color.sector': 'Sector', 'color.knob': 'Knob', 'color.btn': 'Top buttons',
    'scheme.name': 'Scheme name', 'scheme.save': 'Save as new',
    'scheme.defaultName': 'My colours', 'scheme.delete': 'Delete',
    'contrast.warn': 'The sector and the face only contrast {r}:1 — the sweep may be hard to read. Try a deeper sector colour.',
    'appearance.mode': 'Display mode', 'mode.full': 'Full body', 'mode.dial': 'Bare dial',
    'appearance.size': 'Size',
    'appearance.idleFade': 'Fade when idle',
    'appearance.idleFadeHint': 'Fades between runs; move the pointer over it to bring it back',
    'appearance.opacity': 'Opacity', 'appearance.opacityHint': 'How solid it is while a countdown is running',
    'appearance.idleOpacity': 'Idle opacity', 'appearance.idleOpacityHint': 'How far it fades between runs; hovering always brings it back to solid',
    'text.quote': 'Motto', 'text.label': 'Label', 'text.labelHint': 'The small word on the case',
    'alert.sound': 'Chime', 'alert.soundHint': 'One soft note when the countdown ends',
    'alert.click': 'Button clicks', 'alert.clickHint': 'A dry click on press; reset gets a wind-back sweep',
    'alert.notify': 'System notification', 'alert.notifyHint': 'Reaches you even behind a fullscreen window',
    'open.history': 'Open history window',

    'nav.prev': 'Previous day', 'nav.next': 'Next day', 'nav.today': 'Today',
    'summary': '{n} sessions  ·  {m} min total',
    'summary.one': '{n} session  ·  {m} min total',
    'empty.1': 'No finished countdowns on this day.', 'empty.2': 'Complete one and a ring appears here.',
    'heat.title': 'Last 30 days',
    'unit.min': '{m} min'
  },

  fr: {
    'app.name': 'Sweep',
    'win.settings': 'Sweep — Réglages',
    'win.history': 'Sweep — Historique',

    'btn.start': 'DÉPART', 'btn.pause': 'PAUSE', 'btn.reset': 'RAZ',
    'tip.startPause': 'Démarrer / mettre en pause', 'tip.reset': 'Remettre à zéro',
    'again': '↻ Encore {m} min',

    'notify.title': 'Temps écoulé',
    'notify.body': '{m} minutes de concentration, terminé.',

    'menu.toDial': 'Passer au cadran seul', 'menu.toFull': 'Passer au boîtier complet',
    'menu.size': 'Taille', 'menu.colors': 'Couleurs', 'menu.language': 'Langue',
    'menu.history': 'Historique…', 'menu.settings': 'Réglages…', 'menu.quit': 'Quitter Sweep',
    'size.small': 'Petit', 'size.medium': 'Moyen', 'size.large': 'Grand', 'size.xlarge': 'Très grand',
    'menu.edit': 'Édition',

    'settings.title': 'Réglages',
    'sec.schemes': 'Palettes', 'sec.custom': 'Couleurs personnalisées', 'sec.appearance': 'Apparence',
    'sec.faceText': 'Texte du cadran', 'sec.alert': 'À la fin du compte à rebours', 'sec.language': 'Langue',
    'color.body': 'Boîtier', 'color.sector': 'Secteur', 'color.knob': 'Bouton central', 'color.btn': 'Boutons du haut',
    'scheme.name': 'Nom de la palette', 'scheme.save': 'Enregistrer',
    'scheme.defaultName': 'Ma palette', 'scheme.delete': 'Supprimer',
    'contrast.warn': "Le secteur et le cadran ne contrastent qu'à {r}:1 — le balayage risque d'être peu lisible. Essayez un secteur plus foncé.",
    'appearance.mode': 'Mode d’affichage', 'mode.full': 'Boîtier complet', 'mode.dial': 'Cadran seul',
    'appearance.size': 'Taille',
    'appearance.idleFade': 'Estomper au repos',
    'appearance.idleFadeHint': 'S’estompe entre deux séances ; survolez pour la rétablir',
    'appearance.opacity': 'Opacité', 'appearance.opacityHint': 'L’opacité pendant un compte à rebours',
    'appearance.idleOpacity': 'Opacité au repos', 'appearance.idleOpacityHint': 'Jusqu’où elle descend entre deux séances ; le survol la ramène toujours à l’opacité pleine',
    'text.quote': 'Devise', 'text.label': 'Étiquette', 'text.labelHint': 'Le petit mot sur le boîtier',
    'alert.sound': 'Carillon', 'alert.soundHint': 'Une note douce à la fin',
    'alert.click': 'Clic des boutons', 'alert.clickHint': "Un clic sec à la pression ; la remise à zéro a un son de rembobinage",
    'alert.notify': 'Notification système', 'alert.notifyHint': 'Vous atteint même derrière une fenêtre plein écran',
    'open.history': 'Ouvrir l’historique',

    'nav.prev': 'Jour précédent', 'nav.next': 'Jour suivant', 'nav.today': 'Aujourd’hui',
    'summary': '{n} séances  ·  {m} min au total',
    'summary.one': '{n} séance  ·  {m} min au total',
    'empty.1': 'Aucun compte à rebours terminé ce jour-là.', 'empty.2': 'Terminez-en un et un anneau apparaîtra ici.',
    'heat.title': '30 derniers jours',
    'unit.min': '{m} min'
  }
}

function t (lang, key, vars) {
  const table = STRINGS[lang] || STRINGS.en
  let s = table[key]
  if (s === undefined) s = STRINGS.en[key]
  if (s === undefined) return key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v)
  return s
}

function localeOf (lang) {
  const entry = LANGS.find(l => l.id === lang)
  return entry ? entry.locale : 'en'
}

// Map a system locale such as "zh-Hant-TW" or "fr-CA" onto one of our four.
function detectLang (systemLocale) {
  const s = String(systemLocale || '')
  if (/^zh/i.test(s)) {
    return /Hant|TW|HK|MO/i.test(s) ? 'zh-Hant' : 'zh-Hans'
  }
  if (/^ja/i.test(s)) return 'ja'
  if (/^fr/i.test(s)) return 'fr'
  return 'en'
}

// Fill in every element tagged with data-i18n / -ph / -title under `root`.
function applyDom (root, lang) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(lang, el.dataset.i18n) })
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(lang, el.dataset.i18nPh) })
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(lang, el.dataset.i18nTitle) })
}

if (typeof module !== 'undefined' && module.exports) module.exports = { LANGS, STRINGS, t, localeOf, detectLang, applyDom }
if (typeof window !== 'undefined') Object.assign(window, { LANGS, t, localeOf, detectLang, applyDom })
