// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: 🦙;

// ============ 配置 ============
// 在 https://ollama.com/settings/keys 创建一个 API Key，粘贴到下面引号里替换占位符
// （建议单独创建一个，便于随时撤销）
const API_KEY = "在这里粘贴你的API_KEY"
const USAGE_URL = "https://ollama.com/api/usage"
// ==============================

const CACHE_KEY = "ollama_usage_cache_v3"

// ---------- 取数 ----------
// 接口支持 range=24h / 7d / 30d，返回请求次数 totals 和按时间分桶的 buckets 明细
let stats = null
let isStale = false

let cachedRaw = null
try { if (Keychain.contains(CACHE_KEY)) cachedRaw = Keychain.get(CACHE_KEY) } catch (e) {}

try {
  const mkReq = function (range) {
    const req = new Request(USAGE_URL + "?range=" + range)
    req.headers = { "Authorization": "Bearer " + API_KEY }
    req.timeoutInterval = 12
    return req.loadJSON().catch(function (e) { return null })
  }
  // 三个时间窗并行请求，单个失败不影响其他
  const results = await Promise.all([mkReq("24h"), mkReq("7d"), mkReq("30d")])
  if (results[0] && results[0].totals && results[1] && results[1].totals) {
    stats = { h24: results[0], d7: results[1], d30: results[2] || null }
    try { Keychain.set(CACHE_KEY, JSON.stringify(stats)) } catch (e) {}
  }
} catch (e) {}

if (!stats && cachedRaw) {
  try { stats = JSON.parse(cachedRaw); isStale = true } catch (e) {}
}

function count(s) { return (s && s.totals && s.totals.request_count) || 0 }
function fmtN(n) { return n >= 10000 ? (n / 1000).toFixed(1) + "k" : String(n) }
function c24() { return count(stats.h24) }
function c7() { return count(stats.d7) }
function c30() { return stats.d30 ? count(stats.d30) : null }

// ---------- 构建小组件 ----------
const family = config.widgetFamily || "medium"
const widget = new ListWidget()
// 锁屏（accessory）组件空间极小，不加默认内边距；主屏组件保持默认内边距
if (family.indexOf("accessory") !== 0) widget.useDefaultPadding()

if (!stats) {
  const errTitle = widget.addText("Ollama 用量")
  errTitle.font = Font.boldSystemFont(13)
  widget.addSpacer(4)
  const errBody = widget.addText("获取失败：检查网络或 API Key")
  errBody.font = Font.regularSystemFont(11)
  errBody.minimumScaleFactor = 0.6
} else if (family === "accessoryCircular") {
  // 锁屏圆形：近 24 小时请求数
  const stack = widget.addStack()
  stack.layoutVertically()
  const num = stack.addText(fmtN(c24()))
  num.font = Font.boldSystemFont(19)
  num.minimumScaleFactor = 0.5
  num.lineLimit = 1
  const cap = stack.addText("近24h")
  cap.font = Font.regularSystemFont(10)
} else if (family === "accessoryRectangular") {
  // 锁屏矩形：可用宽度极窄，每行必须短且禁止折行（lineLimit=1）
  const title = widget.addText("Ollama 用量" + (isStale ? " ·缓存" : ""))
  title.font = Font.semiboldSystemFont(10)
  title.lineLimit = 1
  widget.addSpacer(2)
  const l24 = widget.addText("近24h " + fmtN(c24()) + " 次")
  l24.font = Font.boldSystemFont(11)
  l24.lineLimit = 1
  l24.minimumScaleFactor = 0.5
  const l7 = widget.addText("近7天 " + fmtN(c7()) + " 次")
  l7.font = Font.boldSystemFont(11)
  l7.lineLimit = 1
  l7.minimumScaleFactor = 0.5
  widget.addSpacer(2)
  const l30 = widget.addText(c30() == null ? " " : "近30天 " + fmtN(c30()) + " 次")
  l30.font = Font.regularSystemFont(9)
  l30.lineLimit = 1
  l30.minimumScaleFactor = 0.5
} else if (family === "accessoryInline") {
  // 锁屏内联（单行）
  const t = widget.addText("Ollama 24h " + fmtN(c24()) + " 次 · 7天 " + fmtN(c7()) + " 次")
  t.font = Font.semiboldSystemFont(11)
  t.minimumScaleFactor = 0.6
  t.lineLimit = 1
} else {
  // 主屏幕小组件（small / medium / large）
  const title = widget.addText("🦙 Ollama 用量" + (isStale ? " ·缓存" : ""))
  title.font = Font.boldSystemFont(13)
  widget.addSpacer(6)

  const big = widget.addText(fmtN(c24()) + " 次")
  big.font = Font.boldSystemFont(26)
  big.minimumScaleFactor = 0.5
  const lab = widget.addText("近 24 小时请求")
  lab.font = Font.regularSystemFont(10)
  widget.addSpacer(4)
  const row = widget.addText("近7天 " + fmtN(c7()) + " 次" + (c30() == null ? "" : " · 近30天 " + fmtN(c30()) + " 次"))
  row.font = Font.regularSystemFont(11)
  row.minimumScaleFactor = 0.6
  row.lineLimit = 1

  if (family !== "small") {
    widget.addSpacer(8)
    addChart(widget, stats.d7, family === "medium" ? 320 : 320, 45)
    const cap = widget.addText("近 7 天每日分布")
    cap.font = Font.regularSystemFont(9)
  }
}

// 近 7 天每日请求柱状图（最后一根为今天，蓝色；其余灰色）
function addChart(w, d7, chartWidth, chartHeight) {
  const buckets = (d7 && d7.buckets) || []
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