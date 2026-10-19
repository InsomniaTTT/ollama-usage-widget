# Ollama 用量锁屏小组件

在 **iPhone 锁屏 / 主屏幕**上随时查看 [Ollama](https://ollama.com) 云端模型的用量统计：

- 🔢 **近 24 小时请求数**（大数字）
- 📊 **近 7 天 / 近 30 天请求总数**
- 📈 **近 7 天每日请求分布柱状图**（主屏中/大尺寸）

数据来自 [ollama.com](https://ollama.com) 官网 Dashboard 同款接口，手机直接请求官方 API，**不需要电脑常开、不需要自建服务**。

> **v2 更新（2026-10-19）**：Ollama 于 2026 年 10 月改版了用量接口——`/api/usage` 从"会话/每周额度百分比"变为"请求数时间序列"（`range=24h/7d/30d`）。本组件已适配新接口，同时修复了在 Scriptable App 内手动运行时的 TypeError 崩溃。

## 小组件样式

| 位置 | 样式 | 显示内容 |
|---|---|---|
| 锁屏 | 圆形 | 近 24h 请求数（大数字） |
| 锁屏 | 矩形 | 标题 + 近24h / 近7天 / 近30天 请求数（各一行） |
| 锁屏 | 内联（时钟上方） | `Ollama 24h 470 次 · 7天 488 次` |
| 主屏 | 小 | 大数字（近24h）+ 近7天/近30天统计行 |
| 主屏 | 中 / 大 | 以上全部 + 近 7 天每日分布柱状图（今天蓝色，其余灰色） |

## 原理

- 数据源：`GET https://ollama.com/api/usage?range=24h|7d|30d`，使用 [API Key](https://ollama.com/settings/keys) 以 `Authorization: Bearer` 鉴权，与 ollama.com 官网 Dashboard 同源。
- 返回结构：`totals.request_count`（该时间窗总请求数）+ `buckets[]`（按小时/天分桶的请求数明细）。
- 三个时间窗并行请求，单个失败不影响整体展示；网络异常时回退展示 Keychain 中最近一次成功数据（标 `·缓存`）。
- ⚠️ Ollama 官方目前没有累计 token 数或额度百分比的公开 API；此接口属于非官方文档化的接口，Ollama 若再调整可能需要相应更新。

## 安装

1. **环境要求**：iPhone（iOS 16+，锁屏小组件需要 iOS 16），能访问 ollama.com 的网络。
2. App Store 安装免费的 [**Scriptable**](https://apps.apple.com/app/scriptable/id1405459708)。
3. 把本仓库的 `OllamaUsage.js` 发送到手机（微信/邮件/AirDrop 均可），在 Scriptable 中新建脚本并粘贴全部内容。
4. 浏览器登录 [ollama.com](https://ollama.com) → [API Keys 页](https://ollama.com/settings/keys) 创建一个 Key，替换脚本顶部的 `API_KEY` 占位符。
5. 在 Scriptable 中点 ▶ 运行一次，会弹出预览并显示真实数据，说明配置成功。
6. 添加小组件：
   - **锁屏**：长按锁屏 → 自定 → 点时钟下方区域 → 添加小组件 → 选 **Scriptable** → 选 `OllamaUsage` 脚本，样式选圆形或矩形。
   - **主屏**：长按桌面 → 编辑 → 左上角 + → 搜 Scriptable → 选小/中/大尺寸 → 长按小组件配置脚本为 `OllamaUsage`。

## 配置项

| 常量 | 默认值 | 说明 |
|---|---|---|
| `API_KEY` | 占位符 | 你的 ollama.com API Key（[创建地址](https://ollama.com/settings/keys)） |

## 常见问题

- **显示「获取失败」**：检查 `API_KEY` 是否有效、手机能否访问 ollama.com。
- **App 内运行报 TypeError**：已在 v2 修复（旧版在 App 内手动运行会因 `config.widgetFamily` 未定义而崩溃，小组件环境不受影响）。
- **显示「·缓存」**：本次网络请求失败，展示的是 Keychain 中的最近一次成功数据。
- **多久刷新一次**：锁屏小组件由 iOS 系统调度（脚本已提示 15 分钟刷新），点亮屏幕时通常会更新；后台长驻不保证实时。
- **安全性**：API Key 只保存在你自己手机的脚本里，建议专门为小组件创建一个独立 Key，随时可在 [settings/keys](https://ollama.com/settings/keys) 撤销，不影响其他工具。

## 已知限制

- 依赖 ollama.com 的非公开接口 `/api/usage`，接口 2026-10 已改版过一次；若再次变化，以实际返回为准并更新脚本。
- 网页 Usage 面板中的「会话/每周额度百分比」目前未通过 API Key 开放，本组件展示的是 Dashboard 的请求数口径。

## English Quickstart

An iOS lock-screen widget (via the free **Scriptable** app) that shows your [ollama.com](https://ollama.com) cloud usage — request counts for the last 24 hours / 7 days / 30 days, plus a 7-day daily bar chart on the home screen — fetched directly from the same API the official Dashboard uses.

1. Install Scriptable from the App Store, create a new script, paste the contents of `OllamaUsage.js`.
2. Create an API key at [ollama.com/settings/keys](https://ollama.com/settings/keys) and put it in the `API_KEY` constant.
3. Run the script once in Scriptable to verify data.
4. Long-press the Lock Screen → Customize → add a Scriptable widget pointing to the script.

## License

[MIT](./LICENSE) — 仅供学习交流，非 Ollama 官方项目。