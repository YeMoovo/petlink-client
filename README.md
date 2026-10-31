# PetLink 桌宠客户端

PetLink 是一个可以独立运行的桌面宠物客户端：桌宠住在桌面上，对话、碎碎念和余额由
AstrBot 侧的 [astrbot_plugin_petlink](https://github.com/YeMoovo/astrbot_plugin_petlink)
转发给 AstrBot，再交给大模型。

```
PetLink 客户端（Electron）
   │  HTTP + 设备令牌
   ▼
astrbot_plugin_petlink（AstrBot 插件，默认 127.0.0.1:8787）
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

## 快速开始

1. 在 AstrBot 安装 [astrbot_plugin_petlink](https://github.com/YeMoovo/astrbot_plugin_petlink)，
   配置 `device_token` / `device_username`；
2. 启动 PetLink 客户端：

   ```bash
   npm install
   npm run standalone
   ```

   或使用 Release 里的 `PetLink.exe`（绿色版）；
3. 首次启动会自动打开设置页：

   ```
   http://127.0.0.1:3080/standalone-settings/
   ```

   设置登录密码 → 填插件地址与配对令牌 → 测试连接 → 保存；
4. 右键桌宠 →「打开 AI 设置」可继续配置模型、碎碎念与身份。

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
