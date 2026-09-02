# Ollama 用量锁屏小组件

在 **iPhone 锁屏 / 主屏幕**上随时查看 [Ollama](https://ollama.com) 云端模型的用量：

- 📊 **会话用量百分比**（Session usage）
- 📊 **每周用量百分比**（Weekly usage）
- ⏳ **重置倒计时**（"Resets in ..."）
- 🔢 **本周各模型请求次数**（Models used this week）

数据来自 [ollama.com](https://ollama.com) 网页后台 **Cloud usage** 面板的同一个接口，手机直接请求官方 API，**不需要电脑常开、不需要自建服务**。

## 小组件样式

| 位置 | 样式 | 显示内容 |
|---|---|---|
| 锁屏 | 圆形 | `34%`（本周） |
| 锁屏 | 矩形 | 标题 + `会话 23.2% · 3小时后重置` + `本周 34.7% · 4天后重置` + 首位模型请求次数 |
| 锁屏 | 内联（时钟上方） | `Ollama 会话 23% · 本周 35%` |
| 主屏 | 小 | 两根进度条 + 重置倒计时 |
| 主屏 | 中 / 大 | 进度条 + 倒计时 + 请求总数 + 各模型明细 |

主屏样式与官方网页的 Cloud usage 面板一致：两根「x.x% used」进度条（超过 90% 变红）。

## 原理

- 数据源：`GET https://ollama.com/api/usage`，使用 [API Key](https://ollama.com/settings/keys) 以 `Authorization: Bearer` 鉴权，与 ollama.com 网页后台同源，无需额外权限。
- 返回的 `limits.session.usage` / `limits.weekly.usage` 是 0~1 的小数，乘 100 即面板上的百分比。
- ⚠️ Ollama 官方**没有**累计 token 数统计接口，用量按各模型 token 费率折算为额度百分比，这正是网页后台显示的口径。
- 重置时间不在接口返回中（由 ollama.com 服务端渲染页面时计算），脚本通过两条可配置规则自行推算倒计时（见下文「校准重置时间」）。

## 安装

1. **环境要求**：iPhone（iOS 16+，锁屏小组件需要 iOS 16），能访问 ollama.com 的网络。
2. App Store 安装免费的 [**Scriptable**](https://apps.apple.com/app/scriptable/id1405459708)。
3. 把本仓库的 `OllamaUsage.js` 发送到手机（微信/邮件/AirDrop 均可），在 Scriptable 中新建脚本并粘贴全部内容。
4. 浏览器登录 [ollama.com](https://ollama.com) → [API Keys 页](https://ollama.com/settings/keys) 创建一个 Key，替换脚本顶部的 `API_KEY` 占位符。
5. 在 Scriptable 中点 ▶ 运行一次，会弹出预览并显示真实数据，说明配置成功。
6. 添加小组件：
   - **锁屏**：长按锁屏 → 自定 → 点时钟下方区域 → 添加小组件 → 选 **Scriptable** → 选 `OllamaUsage` 脚本，样式选圆形或矩形。
   - **主屏**：长按桌面 → 编辑 → 左上角 + → 搜 Scriptable → 选小/中/大尺寸 → 在小组件上长按配置脚本为 `OllamaUsage`。

## 配置项

| 常量 | 默认值 | 说明 |
|---|---|---|
| `API_KEY` | 占位符 | 你的 ollama.com API Key（[创建地址](https://ollama.com/settings/keys)） |
| `SESSION_ANCHOR_ISO` | `2026-09-02T13:00:00Z` | 会话窗口任意一个重置边界的 UTC 时间，用于推算倒计时 |
| `SESSION_CYCLE_HOURS` | `5` | 会话窗口时长（小时） |
| `WEEKLY_RESET_UTC_HOUR` | `0` | 每周重置的 UTC 时刻（0 = 周一 00:00 UTC） |

### 校准重置时间

重置时间不在 API 中，脚本按「会话 = 固定 5 小时窗口 / 每周 = 周一 00:00 UTC」推算，这两个规则来自对 ollama.com 后台的观察，**不同账号可能存在差异**。如果发现倒计时不准：

1. 登录 [ollama.com/settings](https://ollama.com/settings)，把鼠标悬停在 **"Resets in ..."** 文案上，浏览器会提示精确的重置时间（如 `Wed, Sep 2, 9:00 PM`）。
2. 将该时间换算成 UTC，更新 `SESSION_ANCHOR_ISO`（会话）或 `WEEKLY_RESET_UTC_HOUR`（每周）即可，一分钟搞定。

## 常见问题

- **显示「获取失败」**：检查 `API_KEY` 是否有效、手机能否访问 ollama.com。
- **显示「·缓存」**：本次网络请求失败，展示的是 Keychain 中的最近一次成功数据。
- **多久刷新一次**：锁屏小组件由 iOS 系统调度（脚本已提示 15 分钟刷新），点亮屏幕时通常会更新；后台长驻不保证实时。
- **安全性**：API Key 只保存在你自己手机的脚本里，建议专门为小组件创建一个独立 Key，随时可在 [settings/keys](https://ollama.com/settings/keys) 撤销，不影响其他工具。

## 已知限制

- 依赖 ollama.com 的用量接口 `/api/usage`，属于**非官方公开文档**的接口，Ollama 若调整接口或面板口径，本脚本可能需要相应更新。
- 锁屏空间有限，矩形样式只展示首位模型的请求数；完整模型明细见主屏中/大样式。

## English Quickstart

An iOS lock-screen widget (via the free **Scriptable** app) that shows your [ollama.com](https://ollama.com) cloud usage — session %, weekly %, reset countdowns, and per-model request counts — fetched directly from the same API the official Cloud usage dashboard uses.

1. Install Scriptable from the App Store, create a new script, paste the contents of `OllamaUsage.js`.
2. Create an API key at [ollama.com/settings/keys](https://ollama.com/settings/keys) and put it in the `API_KEY` constant.
3. Run the script once in Scriptable to verify data.
4. Long-press the Lock Screen → Customize → add a Scriptable widget pointing to the script.

If the reset countdown looks wrong for your account, calibrate `SESSION_ANCHOR_ISO` / `SESSION_CYCLE_HOURS` / `WEEKLY_RESET_UTC_HOUR` (see the Chinese section above for how to read your exact reset time from the settings page).

## License

[MIT](./LICENSE) — 仅供学习交流，非 Ollama 官方项目。