// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: 🦙;

// ============ 配置 ============
// 在 https://ollama.com/settings/keys 创建一个 API Key，
// 粘贴到下面引号里替换占位符（建议单独创建一个，便于随时撤销）
const API_KEY = "在这里粘贴你的API_KEY"
const USAGE_URL = "https://ollama.com/api/usage"

// —— 重置时间规则（可按自己账号校准）——
// 会话额度：固定 5 小时一个窗口，SESSION_ANCHOR_ISO 是任意一个窗口边界（UTC 时间）。
// 查询方法：登录 https://ollama.com/settings ，把鼠标悬停在 "Resets in ..." 文案上，
// 会弹出具体重置时间（如 "Wed, Sep 2, 9:00 PM"），换算成 UTC 填进来即可。
const SESSION_ANCHOR_ISO = "2026-09-02T13:00:00Z"
const SESSION_CYCLE_HOURS = 5
// 每周额度：每周一 00:00 UTC 重置（北京时间周一 08:00），不同账号可能不同，
// 同样可在 settings 页悬停确认
const WEEKLY_RESET_UTC_HOUR = 0
// ===============================================================

const CACHE_KEY = "ollama_usage_cache_v2"

// ---------- 取数 ----------
let usage = null
let isStale = false

let cachedRaw = null
try { if (Keychain.contains(CACHE_KEY)) cachedRaw = Keychain.get(CACHE_KEY) } catch (e) {}

try {
  const req = new Request(USAGE_URL)
  req.headers = { "Authorization": "Bearer " + API_KEY }
  req.timeoutInterval = 12
  const resp = await req.loadJSON()
  if (resp && resp.limits) {
    usage = resp
    try { Keychain.set(CACHE_KEY, JSON.stringify(resp)) } catch (e) {}
  }
} catch (e) {}

if (!usage && cachedRaw) {
  try { usage = JSON.parse(cachedRaw); isStale = true } catch (e) {}
}

// ---------- 格式化 ----------
// limits.session.usage / limits.weekly.usage 本身就是用量面板上的百分比（0~1 的小数）
function pct(v) {
  if (v == null || isNaN(v)) return "—"
  return (v * 100).toFixed(1) + "%"
}
function pctShort(v) {
  if (v == null || isNaN(v)) return "—"
  return Math.round(v * 100) + "%"
}
function getSession() { return (usage && usage.limits && usage.limits.session) || {} }
function getWeekly() { return (usage && usage.limits && usage.limits.weekly) || {} }

// ---------- 重置倒计时 ----------
function sessionResetAt() {
  const anchor = Date.parse(SESSION_ANCHOR_ISO)
  const cycle = SESSION_CYCLE_HOURS * 3600 * 1000
  const now = Date.now()
  const next = anchor + Math.ceil((now - anchor) / cycle) * cycle
  return next > now ? next : next + cycle
}
function weeklyResetAt() {
  const now = new Date()
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const addDays = (8 - now.getUTCDay()) % 7 // 到下一个周一
  let t = todayUTC + addDays * 86400000 + WEEKLY_RESET_UTC_HOUR * 3600000
  if (t <= Date.now()) t += 7 * 86400000
  return t
}
function fmtCountdown(ms) {
  if (ms < 0) ms = 0
  const mins = Math.round(ms / 60000)
  if (mins < 60) return mins + "分钟"
  const hours = mins / 60
  if (hours < 24) return Math.round(hours) + "小时"
  return Math.floor(hours / 24) + "天"
}
function sessionCountdown() { return fmtCountdown(sessionResetAt() - Date.now()) }
function weeklyCountdown() { return fmtCountdown(weeklyResetAt() - Date.now()) }

// ---------- 构建小组件 ----------
const family = config.widgetFamily
const widget = new ListWidget()
// 锁屏（accessory）组件空间极小，不加默认内边距；主屏组件保持默认内边距
if (family.indexOf("accessory") !== 0) widget.useDefaultPadding()

if (!usage) {
  const errTitle = widget.addText("Ollama 用量")
  errTitle.font = Font.boldSystemFont(13)
  widget.addSpacer(4)
  const errBody = widget.addText("获取失败：检查网络或 API Key")
  errBody.font = Font.regularSystemFont(11)
  errBody.minimumScaleFactor = 0.6
} else if (family === "accessoryCircular") {
  // 锁屏圆形：本周百分比
  const stack = widget.addStack()
  stack.layoutVertically()
  const num = stack.addText(pctShort(getWeekly().usage))
  num.font = Font.boldSystemFont(19)
  num.minimumScaleFactor = 0.5
  num.lineLimit = 1
  const cap = stack.addText("本周")
  cap.font = Font.regularSystemFont(10)
} else if (family === "accessoryRectangular") {
  // 锁屏矩形：可用宽度极窄，每行必须短且禁止折行（lineLimit=1），
  // 否则"本周"这类词会被硬拆到两行
  const title = widget.addText("Ollama 用量" + (isStale ? " ·缓存" : ""))
  title.font = Font.semiboldSystemFont(10)
  title.lineLimit = 1
  widget.addSpacer(2)
  const ses = widget.addText("会话 " + pct(getSession().usage) + " · " + sessionCountdown() + "后重置")
  ses.font = Font.boldSystemFont(11)
  ses.lineLimit = 1
  ses.minimumScaleFactor = 0.5
  const wk = widget.addText("本周 " + pct(getWeekly().usage) + " · " + weeklyCountdown() + "后重置")
  wk.font = Font.boldSystemFont(11)
  wk.lineLimit = 1
  wk.minimumScaleFactor = 0.5
  widget.addSpacer(2)
  const models = getWeekly().models || []
  const first = models.length ? models[0].name + " " + models[0].request_count + "次" : " "
  const sub = widget.addText(first)
  sub.font = Font.regularSystemFont(9)
  sub.lineLimit = 1
  sub.minimumScaleFactor = 0.5
} else if (family === "accessoryInline") {
  // 锁屏内联（单行）
  const t = widget.addText("Ollama 会话 " + pctShort(getSession().usage) + " · 本周 " + pctShort(getWeekly().usage))
  t.font = Font.semiboldSystemFont(11)
  t.minimumScaleFactor = 0.6
  t.lineLimit = 1
} else {
  // 主屏幕小组件（small / medium / large），和网页 Cloud usage 面板对齐
  const title = widget.addText("🦙 Ollama 用量")
  title.font = Font.boldSystemFont(13)
  widget.addSpacer(6)

  const models = getWeekly().models || []
  const reqCount = models.reduce(function (s, m) { return s + (m.request_count || 0) }, 0)
  const barWidth = family === "small" ? 150 : 330

  addBar(widget, "会话", getSession().usage, barWidth)
  const sesReset = widget.addText(sessionCountdown() + "后重置")
  sesReset.font = Font.regularSystemFont(9)
  widget.addSpacer(5)
  addBar(widget, "本周", getWeekly().usage, barWidth)
  const wkReset = widget.addText(weeklyCountdown() + "后重置")
  wkReset.font = Font.regularSystemFont(9)
  widget.addSpacer(6)

  const row = widget.addText("本周共 " + reqCount + " 次请求" + (isStale ? " ·缓存" : ""))
  row.font = Font.regularSystemFont(10)

  if (family !== "small" && models.length > 0) {
    widget.addSpacer(2)
    for (const m of models.slice(0, 4)) {
      const line = widget.addText(m.name + "：" + m.request_count + " 次")
      line.font = Font.regularSystemFont(10)
      line.minimumScaleFactor = 0.7
    }
  }
}

// 进度条：左标签 + 右百分比，下面一条蓝灰色进度条（和面板样式一致）
function addBar(w, label, value, barWidth) {
  const v = (value == null || isNaN(value)) ? 0 : Math.min(1, value)
  const head = w.addStack()
  head.layoutHorizontally()
  const l = head.addText(label)
  l.font = Font.semiboldSystemFont(11)
  head.addSpacer()
  const r = head.addText(pct(value) + " used")
  r.font = Font.semiboldSystemFont(11)
  w.addSpacer(2)
  const track = w.addStack()
  track.layoutHorizontally()
  track.size = new Size(barWidth, 6)
  track.backgroundColor = Color.gray()
  track.cornerRadius = 3
  const fillW = Math.max(2, barWidth * v)
  if (v > 0) {
    const fill = track.addStack()
    fill.size = new Size(fillW, 6)
    fill.backgroundColor = v > 0.9 ? Color.red() : Color.blue()
    fill.cornerRadius = 3
  }
  // Stack 对固定尺寸子元素默认居中且没有靠左 API，
  // 用显式宽度的 spacer 占掉剩余宽度，色条就固定在最左边
  track.addSpacer(Math.max(0, barWidth - fillW))
}

config.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

if (!config.runsInWidget) {
  // 在 Scriptable App 里手动运行时弹出预览，方便测试
  await widget.presentMedium()
}

Script.setWidget(widget)
Script.complete()