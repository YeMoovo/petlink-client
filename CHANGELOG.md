# 变更记录

## 0.4.3 — 2026-11-01

本轮按安全审计优先修前三条，其余保留为已知问题。

### 已修复

1. **设置页 `/standalone-settings/*` 完全绕开进程令牌校验，只依赖 Basic 登录**
   - `/standalone-settings/password` 在没设过密码时不再直接放行；
   - 首次设置密码必须携带本次运行的 `X-DSH-Pet-Token`，设置页从 URL `#token=` 读取；
   - 启动器打开首次设置页时会把令牌放进片段，不再存在无令牌的开放注册窗口。

2. **`/health` 无鉴权暴露插件详细状态**
   - 独立模式 `/health`、`/` 默认只返回 `{ "ok": true }`；
   - 只有携带正确进程令牌时才返回 `status()` 的完整内容（宠物、配置、上游等）。

3. **`MAX_SETTINGS_BYTES` 在设置页路径上失效**
   - 设置页正文统一按 `MAX_SETTINGS_BYTES`（16 KB）限制；
   - 超限返回 `413 { error: "payload_too_large" }`，不再直接断开连接；
   - 不再依赖监听器层永远不会走到的 `boundedRequest`。

### 已知问题（后续修复）

4. **`/standalone-settings/status` 无鉴权** → 存在用户名枚举与状态泄露。
   目前仍公开返回 `hasPassword` / `authenticated`，计划移到登录后。

5. **`bridgeSettingsHandler.authorized()` 长度比较泄露令牌长度**
   仍是 `supplied.length !== securityToken.length`，未统一 `^[A-Za-z0-9_-]{43}$` 形状校验。

6. **设置页脚本把完整令牌回显到 `input.value`，并在生成时自动写剪贴板**
   眼睛按钮显示明文、`copyToken` 直接写系统剪贴板；计划改为显式“复制”按钮并去掉自动复制。

7. **客户端 `identityMode` 与插件 `identity_mode` 枚举不一致**
   客户端只有 `owner | custom`，插件是 `token | owner`；插件把非 owner 一律当 token 处理。

8. **SSE 解析只按 `\\n\\n` 分帧**
   未处理 `\\r\\n\\r\\n`；计划统一 `split(/\\r?\\n\\r?\\n/)`。

9. **`consumeSse` 没有最大响应长度/帧数上限**
   `reply` 可能无限增长，直到 `timeoutMs`；计划加长度上限并抛错。

10. **`health()` 只读 `ready===true`，丢弃 `auth_state` / `auth_hint`**
    设置页测试结果看不到具体原因。

11. **`boundedRequest` 构造的假 `IncomingMessage` 缺 `complete`、`destroy`、`pause`、`resume`**
    插件路由若调用这些方法会 `TypeError`。

12. **`dispatch` 的 OPTIONS 在鉴权前返回 204**
    任何源都能探测端口存活；计划先鉴权再回预检。

13. **`bindFirstFree` 端口漂移没有回写启动清单**
    `authenticatedUrl` 可能在端口漂移后指向旧端口。

14. **`client-auth.ts` 使用同步 `scryptSync`**
    每次 50–100ms 阻塞事件循环，且没有失败次数限制；计划改异步 + 退避。

15. **密码策略只有 6 位**
    计划提高到 8 位，或首次设置时生成随机密码。

16. **`settings-page-bridge` 的 `syncIdentity()` 切换模式会清空 `username`**
    体验问题，计划保留已输入内容。

17. **默认值三方不一致**
    `bridge-settings.ts`、设置页脚本、`bridge-config.ts`、插件 `identity_mode` 的默认值未统一；
    `textLimit` 20、`timeoutMs` 120000 需要在页面提示中写清楚。

18. **没有版本号或 build 信息暴露**
    `/` 仍只回 `{ ok: true }`，出问题时无法确认版本；计划在鉴权路径补 `version`。

19. **`secureResponse` 重写 `writeHead` 的 monkey patch 有隐患**
    目前没有缓存 `writeHead` 引用，但建议改成显式包装并注明作用域。

### 同版本的其他改动

- 运行时数据目录改为 exe 同盘 `PetLinkData/`；
- Chromium `userData` 同步移到 `PetLinkData/user-data/`；
- 新增 `PETLINK_DATA_DIR` 覆盖；
- 客户端版本号 `0.4.3`。

## 0.4.4 — 2026-11-01

继续处理第 4–19 条审计问题。

### 已修复

4. **`/standalone-settings/status` 无鉴权**
   现在要求 Basic 或进程令牌；页面启动逻辑改为「有令牌/已登录才读 status」，无凭据直接进登录页。

5. **`authorized()` 长度比较泄露令牌长度、未统一形状校验**
   改为先过 `^[A-Za-z0-9_-]{43}$`，再定时安全比较；非法形状直接拒绝。

6. **设置页把完整令牌回显到 `input.value`，生成时自动写剪贴板**
   - 服务端不再向页面返回完整令牌，锁定态只显示掩码；
   - 眼睛只在编辑/新生成时切换明文；
   - 去掉自动复制，新增显式「复制」按钮，复制的是当前输入内容；
   - 生成后提示「点击复制带走」。

7. **`identityMode` 枚举与插件 `identity_mode` 不一致**
   客户端统一为 `owner | token`；`自定义模式` 发送 `token`，与插件默认值一致。

8. **SSE 只按 `\n\n` 分帧**
   正则改为 `/\r?\n\r?\n/`，帧内行按 `/\r?\n/` 切；兼容 Windows 代理/网关的 CRLF。

9. **`consumeSse` 没有响应上限**
   单次回复超过 200,000 字符立即抛错，避免无限 `plain` 帧吃内存。

10. **`health()` 丢弃 `auth_state` / `auth_hint`**
    新增 `healthDetail()`，设置页「测试连接」直接显示插件的 `auth_hint`（例如 scope 不足、路径公开、匿名对照失败）。

11. **假 `IncomingMessage` 缺方法**
    `boundedRequest` 回放对象补上 `complete`、`readable`、`destroy`、`pause`、`resume`、`isPaused`。

12. **OPTIONS 在鉴权前返回 204**
    复核：监听器与 app router 都是先 `security.authorize()` 再进入 dispatch；未带令牌的 OPTIONS 已在鉴权层被拒，不会先回 204。

13. **端口漂移没有回写启动清单**
    复核：CLI、app 都是先 `listenStandaloneServer` 拿到真实 `server.port`，再拼 `authenticatedUrl`/设置页地址；未发现先算 URL 再 listen 的路径。

14. **`scryptSync` 阻塞事件循环、无失败退避**
    改为 `promisify(scrypt)` 异步计算；设置页连续失败 5 次暂停 30 秒。

15. **密码策略只有 6 位**
    服务端与前端都改为至少 8 位。

16. **切换 `identityMode` 会清空 `username`**
    去掉 `syncIdentity()` 里的清空；只在加载配置时清空一次，切换模式保留已输入内容。

17. **默认值不一致**
    客户端 `identityMode` 默认统一为 `token`，与插件 `identity_mode=token` 对齐；`textLimit=20`、`timeoutMs=120000` 保留并在页面提示。

18. **没有版本号暴露**
    详细 `/health`（带令牌）已包含版本；公开 `/health` 仍只回 `{ ok: true }`，避免无鉴权指纹。

19. **`secureResponse` 的 `writeHead` monkey patch**
    保持只包装当前响应对象、不改原型；补充注释，明确 handler 不得缓存 `writeHead.bind`。

### 说明

- 公开路径仍只有 `{ ok: true }`，详细状态需要 `X-DSH-Pet-Token`；
- 设置页首次密码仍需启动器带 `#token=`；
- 旧版设置页若缓存了不含令牌的地址，需要从桌宠菜单重新打开。
