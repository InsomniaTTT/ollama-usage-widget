// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: 🦙;

// ============ 配置 ============
// 在 https://ollama.com/settings/keys 创建一个 API Key，粘贴到下面引号里替换占位符
// （建议单独创建一个，便于随时撤销）
const API_KEY = "在这里粘贴你的API_KEY"
const API_BASE = "https://ollama.com"
// ==============================

const CACHE_KEY = "ollama_usage_cache_v4"

// ---------- 取数 ----------
// /api/balance        —— 额度：传统计划返回 session/weekly 的 remaining_percent 和 resets_at；
//                        新版月度额度计划返回 balance_usd / allowance_usd / period
// /api/usage?range=…  —— 请求量与模型明细（group_by=model）
let data = { balance: null, d7: null, h24: null }
let isStale = false

let cachedRaw = null
try { if (Keychain.contains(CACHE_KEY)) cachedRaw = Keychain.get(CACHE_KEY) } catch (e) {}

function mkReq(path) {
  const req = new Request(API_BASE + path)
  req.headers = { "Authorization": "Bearer " + API_KEY }
  req.timeoutInterval = 12
  return req.loadJSON().catch(function (e) { return null })
}

let fetched = false
try {
  const results = await Promise.all([
    mkReq("/api/balance"),
    mkReq("/api/usage?range=7d&group_by=model"),
    mkReq("/api/usage?range=24h")
  ])
  if (results[0] || results[1]) {
    data = { balance: results[0], d7: results[1], h24: results[2] }
    fetched = true
    try { Keychain.set(CACHE_KEY, JSON.stringify(data)) } catch (e) {}
  }
} catch (e) {}

if (!fetched && cachedRaw) {
  try { data = JSON.parse(cachedRaw); isStale = true } catch (e) {}
}

// ---------- 数据整理 ----------
const bal = data.balance || {}
const inc = bal.included || {}
const isLegacy = !!(inc.session || inc.weekly) // 传统计划：会话/每周限额
const purchased = (bal.purchased && bal.purchased.balance_usd) || 0

const u7 = data.d7 || {}
const totals7 = u7.totals || {}
const reqTotal = totals7.request_count || 0
const groups = totals7.groups || []
const req24 = (data.h24 && data.h24.totals && data.h24.totals.request_count) || 0
const inTok = totals7.input_tokens
const outTok = totals7.output_tokens

function usedFromRemaining(r) {
  if (r == null || r.remaining_percent == null) return null
  return Math.max(0, Math.min(100, 100 - r.remaining_percent))
}
const sesUsed = usedFromRemaining(inc.session)
const wkUsed = usedFromRemaining(inc.weekly)

function countdownFromISO(iso) {
  if (!iso) return null
  const ms = Date.parse(iso) - Date.now()
  if (isNaN(ms)) return null
  if (ms <= 0) return "已重置"
  const mins = Math.round(ms / 60000)
  if (mins < 60) return mins + "分钟"
  const hours = mins / 60
  if (hours < 24) return Math.round(hours) + "小时"
  return Math.floor(hours / 24) + "天"
}
const sesReset = inc.session ? countdownFromISO(inc.session.resets_at) : null
const wkReset = inc.weekly ? countdownFromISO(inc.weekly.resets_at) : null
const monthReset = inc.period ? countdownFromISO(inc.period.until) : null

function pct1(v) { return v == null ? "—" : v.toFixed(1) + "%" }
function pct0(v) { return v == null ? "—" : Math.round(v) + "%" }
function fmtN(n) {
  if (n == null) return "—"
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 10000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}
function fmtUSD(v) {
  if (v == null) return "—"
  if (v >= 100) return "$" + v.toFixed(0)
  return "$" + v.toFixed(2)
}

function modelsLineShort() {
  if (!groups.length) return null
  return groups.slice(0, 2).map(function (g) {
    return g.model + " " + fmtN(g.request_count) + "次"
  }).join(" · ")
}

// ---------- 构建小组件 ----------
const family = config.widgetFamily || "medium"
const widget = new ListWidget()
if (family.indexOf("accessory") !== 0) widget.useDefaultPadding()

const haveData = data.balance || data.d7

if (!haveData) {
  const errTitle = widget.addText("Ollama 用量")
  errTitle.font = Font.boldSystemFont(13)
  widget.addSpacer(4)
  const errBody = widget.addText("获取失败：检查网络或 API Key")
  errBody.font = Font.regularSystemFont(11)
  errBody.minimumScaleFactor = 0.6
} else if (family === "accessoryCircular") {
  const stack = widget.addStack()
  stack.layoutVertically()
  const num = stack.addText(isLegacy ? pct0(sesUsed) : fmtUSD(inc.balance_usd))
  num.font = Font.boldSystemFont(19)
  num.minimumScaleFactor = 0.5
  num.lineLimit = 1
  const cap = stack.addText(isLegacy ? "会话已用" : "余额")
  cap.font = Font.regularSystemFont(10)
} else if (family === "accessoryRectangular") {
  // 锁屏矩形：每行必须短且禁止折行（lineLimit=1）
  const title = widget.addText("Ollama 用量" + (isStale ? " ·缓存" : ""))
  title.font = Font.semiboldSystemFont(10)
  title.lineLimit = 1
  widget.addSpacer(2)
  const l1 = widget.addText(isLegacy
    ? "会话 " + pct1(sesUsed) + " · " + (sesReset || "—") + "后重置"
    : "余额 " + fmtUSD(inc.balance_usd) + " / " + fmtUSD(inc.allowance_usd))
  l1.font = Font.boldSystemFont(11)
  l1.lineLimit = 1
  l1.minimumScaleFactor = 0.5
  const l2 = widget.addText(isLegacy
    ? "本周 " + pct1(wkUsed) + " · " + (wkReset || "—") + "后重置"
    : "月度重置 " + (monthReset || "—") + "后")
  l2.font = Font.boldSystemFont(11)
  l2.lineLimit = 1
  l2.minimumScaleFactor = 0.5
  widget.addSpacer(2)
  const ml = isLegacy ? modelsLineShort() : ("近7天 " + fmtN(reqTotal) + " 次请求")
  const l3 = widget.addText(ml || " ")
  l3.font = Font.regularSystemFont(9)
  l3.lineLimit = 1
  l3.minimumScaleFactor = 0.5
} else if (family === "accessoryInline") {
  const t = widget.addText(isLegacy
    ? "Ollama 会话 " + pct0(sesUsed) + " · 本周 " + pct0(wkUsed)
    : "Ollama 余额 " + fmtUSD(inc.balance_usd))
  t.font = Font.semiboldSystemFont(11)
  t.minimumScaleFactor = 0.6
  t.lineLimit = 1
} else {
  // 主屏幕小组件（small / medium / large）
  const title = widget.addText("🦙 Ollama 用量" + (isStale ? " ·缓存" : ""))
  title.font = Font.boldSystemFont(13)
  widget.addSpacer(6)

  const barWidth = family === "small" ? 150 : 330

  if (isLegacy) {
    addMeter(widget, "会话", sesUsed, sesReset, barWidth)
    widget.addSpacer(5)
    addMeter(widget, "本周", wkUsed, wkReset, barWidth)
  } else {
    const frac = (inc.balance_usd != null && inc.allowance_usd)
      ? Math.max(0, Math.min(1, 1 - inc.balance_usd / inc.allowance_usd)) : 0
    addMeter(widget, "额度", frac * 100,
      fmtUSD(inc.balance_usd) + " / " + fmtUSD(inc.allowance_usd) + "，" + (monthReset || "—") + "后重置",
      barWidth)
  }
  widget.addSpacer(6)

  const purchasedText = purchased > 0 ? " · 附加 " + fmtUSD(purchased) : ""
  const reqLine = widget.addText("近7天 " + fmtN(reqTotal) + " 次请求" + purchasedText)
  reqLine.font = Font.regularSystemFont(10)
  reqLine.minimumScaleFactor = 0.6
  reqLine.lineLimit = 1

  if (family !== "small") {
    if (groups.length > 0) {
      widget.addSpacer(2)
      for (const g of groups.slice(0, 4)) {
        const line = widget.addText(g.model + "：" + fmtN(g.request_count) + " 次")
        line.font = Font.regularSystemFont(10)
        line.minimumScaleFactor = 0.7
      }
    }
    if (inTok != null && outTok != null) {
      const tok = widget.addText("近7天 tokens：输入 " + fmtN(inTok) + " / 输出 " + fmtN(outTok))
      tok.font = Font.regularSystemFont(10)
      tok.minimumScaleFactor = 0.7
    }
  }
  if (family === "large") {
    widget.addSpacer(8)
    addChart(widget, u7.buckets || [], barWidth, 45)
    const cap = widget.addText("近 7 天每日请求分布")
    cap.font = Font.regularSystemFont(9)
  }
}

// 额度条：左标签 + 右「x.x% used」，下方灰轨蓝色进度条（超过 90% 变红），条下小字倒计时
function addMeter(w, label, pctUsed, tailText, barWidth) {
  const v = (pctUsed == null || isNaN(pctUsed)) ? 0 : Math.min(100, pctUsed)
  const head = w.addStack()
  head.layoutHorizontally()
  const l = head.addText(label)
  l.font = Font.semiboldSystemFont(11)
  head.addSpacer()
  const r = head.addText(pct1(pctUsed) + " used")
  r.font = Font.semiboldSystemFont(11)
  w.addSpacer(2)
  const track = w.addStack()
  track.layoutHorizontally()
  track.size = new Size(barWidth, 6)
  track.backgroundColor = Color.gray()
  track.cornerRadius = 3
  const fillW = Math.max(2, barWidth * v / 100)
  if (v > 0) {
    const fill = track.addStack()
    fill.size = new Size(fillW, 6)
    fill.backgroundColor = v > 90 ? Color.red() : Color.blue()
    fill.cornerRadius = 3
  }
  // Stack 对固定尺寸子元素默认居中且没有靠左 API，用显式宽度 spacer 占掉剩余宽度
  track.addSpacer(Math.max(0, barWidth - fillW))
  const tail = w.addText(tailText ? tailText + "后重置" : " ")
  tail.font = Font.regularSystemFont(9)
}

// 近 7 天每日请求柱状图（最后一根为今天，蓝色；其余灰色）
function addChart(w, buckets, chartWidth, chartHeight) {
  if (!buckets.length) return
  const counts = buckets.map(function (b) { return b.request_count || 0 })
  const max = Math.max.apply(null, counts.concat([1]))
  const gap = 3
  const n = counts.length
  const colW = Math.floor((chartWidth - gap * (n - 1)) / n)
  const chart = w.addStack()
  chart.layoutHorizontally()
  chart.bottomAlignContent()
  chart.spacing = gap
  chart.size = new Size(chartWidth, chartHeight)
  for (let i = 0; i < n; i++) {
    const h = Math.max(2, Math.round(chartHeight * counts[i] / max))
    const col = chart.addStack()
    col.size = new Size(colW, h)
    col.backgroundColor = i === n - 1 ? Color.blue() : Color.gray()
    col.cornerRadius = 2
  }
}

config.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)

if (!config.runsInWidget) {
  // 在 Scriptable App 里手动运行时弹出预览，方便测试
  await widget.presentMedium()
}

Script.setWidget(widget)
Script.complete()