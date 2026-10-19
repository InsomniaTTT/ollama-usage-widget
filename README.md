# Ollama 用量锁屏小组件

在 **iPhone 锁屏 / 主屏幕**上随时查看 [Ollama](https://ollama.com) 云端的用量，与官网 [Usage 面板](https://ollama.com/settings)完全同口径：

- 📊 **会话用量百分比**（Session usage）
- 📊 **每周用量百分比**（Weekly usage）
- ⏳ **精确重置倒计时**（服务器返回的 `resets_at`，非本地推算）
- 🔢 **本周各模型请求次数**（Models used this week）
- 💵 新版月度额度账户：**余额 / 总额度**；USD 计量账户还可显示**近 7 天输入 / 输出 token 数**

数据来自 ollama.com 官方接口（[ollama 仓库 openapi 文档](https://github.com/ollama/ollama/blob/main/docs/openapi.yaml)所列），手机直接请求，**不需要电脑常开、不需要自建服务**。

> **v3 更新（2026-10-19）**：Ollama 于 2026 年 10 月改版用量接口后，本组件迁移到官方 `/api/balance` + `/api/usage` 接口：
> - 百分比与重置时间直接来自服务器（`remaining_percent` / `resets_at`），倒计时永远精确，无需任何本地校准；
> - 同时兼容传统计划（会话/每周限额）与新版月度额度计划；
> - 修复在 Scriptable App 内手动运行时的 TypeError 崩溃。

## 小组件样式

| 位置 | 样式 | 显示内容 |
|---|---|---|
| 锁屏 | 圆形 | 会话已用百分比（大数字）；新版计划显示余额 |
| 锁屏 | 矩形 | `会话 62.4% · 4小时后重置` / `本周 26.2% · 6天后重置` / 模型请求次数 |
| 锁屏 | 内联（时钟上方） | `Ollama 会话 62% · 本周 26%` |
| 主屏 | 小/中 | 两根「x.x% used」进度条 + 倒计时 + 请求统计 + 各模型明细（超过 90% 变红） |
| 主屏 | 大 | 以上全部 + 近 7 天每日请求分布柱状图（今天蓝色，其余灰色） |

## 原理

两个接口均使用 [API Key](https://ollama.com/settings/keys) 以 `Authorization: Bearer` 鉴权，并行请求、互为降级（任一失败不影响其余展示），网络异常时回退 Keychain 缓存（标 `·缓存`）：

| 接口 | 数据 |
|---|---|
| `GET /api/balance` | 传统计划：`session` / `weekly` 的 `remaining_percent` 与 `resets_at`；新版计划：`balance_usd` / `allowance_usd` / 月度周期；附加购买余额 |
| `GET /api/usage?range=7d&group_by=model` | 近 7 天请求总数与各模型请求次数（USD 计量账户还含 `usage_usd` 与输入/输出 token 数） |
| `GET /api/usage?range=24h` | 近 24 小时请求数 |

> ⚠️ Ollama 官方没有公开的「累计 token 总量」接口；传统计划（会话/每周限额）的用量以额度百分比呈现，与官网面板一致。

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
- **显示「·缓存」**：本次网络请求失败，展示的是 Keychain 中的最近一次成功数据。
- **多久刷新一次**：锁屏小组件由 iOS 系统调度（脚本已提示 15 分钟刷新），点亮屏幕时通常会更新；后台长驻不保证实时。
- **百分比和官网对不上**：官网面板数据可能有分钟级延迟（官方文档也提示 "New usage may take time to appear"），以官网为准。
- **安全性**：API Key 只保存在你自己手机的脚本里，建议专门为小组件创建一个独立 Key，随时可在 [settings/keys](https://ollama.com/settings/keys) 撤销，不影响其他工具。

## 已知限制

- `/api/balance` 与 `/api/usage` 属于 Ollama 云端较新的接口，若再次调整以实际返回为准；接口在 2026 年 10 月改版过一次，本组件 v3 已适配。
- 锁屏矩形空间有限，只展示前两个模型的请求数；完整明细见主屏中/大样式。

## English Quickstart

An iOS lock-screen widget (via the free **Scriptable** app) that mirrors the [ollama.com](https://ollama.com) Usage panel — session/weekly usage percentages with exact server-provided reset countdowns, per-model request counts, and (for monthly-credit plans) your balance. Uses the official `/api/balance` + `/api/usage` endpoints with your API key.

1. Install Scriptable from the App Store, create a new script, paste the contents of `OllamaUsage.js`.
2. Create an API key at [ollama.com/settings/keys](https://ollama.com/settings/keys) and put it in the `API_KEY` constant.
3. Run the script once in Scriptable to verify data.
4. Long-press the Lock Screen → Customize → add a Scriptable widget pointing to the script.

## License

[MIT](./LICENSE) — 仅供学习交流，非 Ollama 官方项目。