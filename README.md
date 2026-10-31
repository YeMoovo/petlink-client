# PetLink 桌宠客户端

PetLink 是一个可以独立运行的桌面宠物客户端：桌宠住在桌面上，对话、碎碎念和余额由
AstrBot 侧的 [astrbot_plugin_petlink](https://github.com/YeMoovo/astrbot_plugin_petlink)
转发给 AstrBot，再交给大模型。

```
PetLink 客户端（Electron）
   │  HTTP + 设备令牌
   ▼
astrbot_plugin_petlink（AstrBot 插件，默认 127.0.0.1:18787）
   │  OpenAPI + SSE
   ▼
AstrBot（人设 / 记忆 / 模型）
```

客户端只持有可吊销的设备令牌，永远拿不到 AstrBot 的 `abk_` 上游 Key。

## 功能

- 透明置顶桌面宠物：待机、点击、拖拽、随机走位、睡觉/唤醒；
- 右键菜单：对话、碎碎念、配图、待办、隐藏、动作点播；
- 对话与碎碎念可走 AstrBot，也可配置本机模型；
- 本机设置页：插件地址、配对令牌、身份模式、会话、字数上限、超时；
- 设置页带登录密码，令牌只显示掩码，支持一键生成与复制；
- 单实例、断桥提示、20 字（可配）截断。

## 快速开始（zip 版）

1. 在 AstrBot 安装 [astrbot_plugin_petlink](https://github.com/YeMoovo/astrbot_plugin_petlink)，
   配置 `device_token` / `device_username`；
2. 下载 Release 里的 `PetLink-<版本>-win-x64.zip`，**完整解压**到可写目录，例如
   `D:\PetLink\`；不要在压缩包里直接双击，也不要放 `C:\Program Files`；
3. 双击 `PetLink.exe`；
4. 首次启动会自动打开设置页（端口由本机随机分配，以实际打开地址为准）：

   设置登录密码 → 填插件地址与配对令牌 → 测试连接 → 保存；

5. 右键桌宠 →「打开 AI 设置」可继续配置模型、碎碎念与身份。

> zip 已包含 Electron 运行时与全部业务依赖，不需要安装 Node、npm、pnpm 或 Electron。

### 为什么用 zip，而不是单文件 exe

- 单文件 exe 是 NSIS 自解压壳：每次启动都要把约 400MB 解压到 `%TEMP%`，首次可能几十秒没有窗口；
- 数据目录依赖 `PORTABLE_EXECUTABLE_DIR`，容易回退到 C 盘；
- 进程路径在临时目录，日志与数据不好排查；
- zip 解压一次即可，启动就是正常 Electron 速度，数据固定在 `<解压目录>/PetLinkData`。

## 开发

```bash
npm run typecheck
npm run test
npm run bundle        # 构建 lib/
npm run dist          # 打 Windows 解包目录（dist-app/）
```

要求 Node.js 24+、pnpm 11（仓库使用 `nodeLinker: hoisted`）。

## 数据目录

默认**不写 C 盘用户目录**，而是放在程序同盘：

- 便携 exe：`<PetLink.exe 所在目录>/PetLinkData/dsh-pet/`
- 解包目录：`<解压目录>/PetLinkData/dsh-pet/`
- 想换盘或换目录：设置 `PETLINK_DATA_DIR`，或显式设置 `DSH_HOME`
- 只有 `PetLinkData` 不可写时，才回退到 `~/.dsh` 并打 warning

`remote.json`、`client-auth.json`、`memory.json`、`logs.txt` 都在这个目录里。

## 端口与多实例

- 应用模式与 CLI 都优先使用 **3080**；被占用时向后扫描最多 25 个端口；
- 同一数据目录有 `instance.lock`，重复启动会直接退出，不会起第二个 WebUI；
- 不同数据目录/不同 portable 副本会各自启动，端口互不影响；
- 设置页地址以启动日志/桌宠菜单打开的实际地址为准；正常情况固定为 `http://127.0.0.1:3080/`。

## 安全

- 本机服务只监听 `127.0.0.1`；
- 设置页需要登录密码，令牌不回显完整值；
- 设备令牌与上游 Key 分离，插件端可单独吊销；
- 不要把 `remote.json`、`client-auth.json`、`logs.txt` 上传到公开仓库。

## 许可与二次开源

本项目是 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的衍生版本，
遵循原项目的二次开源要求：

- **代码**：MIT，保留原版权声明，见 [LICENSE](LICENSE)；
- **素材**（动画 / 提示词 / 源视频）：允许开源使用，**禁止商用**；
- **形象**：大肥鱼形象采用
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans)
  （署名 · 非商业 · 相同方式共享），不可用于任何形式的商业化；
- **署名**：本仓库及任何公开发布渠道均须保留原作者地址
  <https://github.com/PC2005-cloud/dsh-pet>；
- 二次创作 / 改版 / 换皮作品同样须遵守上述署名、非商业与相同方式共享要求。

原始 README 与完整素材说明保留在 [docs/UPSTREAM-README.md](docs/UPSTREAM-README.md)。
