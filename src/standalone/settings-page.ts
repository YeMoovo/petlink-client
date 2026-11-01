/**
 * 本机设置页的三份静态资源：HTML、CSS 与脚本。
 *
 * 只在本机回环上由 ./server 提供；不包含构建步骤，也不依赖外部 CDN。
 * 必须始终成立：脚本从地址片段读一次令牌后立刻清掉片段；页面不内联脚本与样式，
 * 以便 CSP 保持 default-src 'none'。
 * @module dsh-pet/src/standalone/settings-page
 */
/** 设置页 HTML。 */
export const settingsPage = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PetLink AI 设置</title><link rel="stylesheet" href="/standalone-ai/settings.css">
<script src="/standalone-ai/settings.js" defer></script></head><body>
<main><header><span class="fish" aria-hidden="true">🐾</span><p class="local">PetLink / 本机设置</p>
<h1>PetLink AI 设置</h1><p class="intro">配置你的大模型 API 接口，开启桌面聊天与碎碎念。<br>所有设置仅保存在本机，支持即时测试连接。</p></header>
<form id="settings" aria-describedby="privacy">
<fieldset><legend>连接插件（AstrBot）</legend>
<label for="bridgeBaseUrl">插件地址（relay）</label><input id="bridgeBaseUrl" type="url" placeholder="http://127.0.0.1:18787" value="http://127.0.0.1:18787" maxlength="2048" spellcheck="false"><p class="hint">AstrBot 插件监听的本机/隧道地址；换端口映射后只改这里。</p>
<label for="bridgeIdentityMode">身份模式</label><select id="bridgeIdentityMode"><option value="owner">QQ号模式</option><option value="token">自定义模式</option></select><p class="hint" id="bridgeIdentityHint"></p>
<label for="bridgeUsername" id="bridgeUsernameLabel">QQ 号</label><input id="bridgeUsername" maxlength="128" placeholder="请输入QQ号"><p class="hint" id="bridgeUsernameHint"></p>
<label for="bridgeSession">会话</label><input id="bridgeSession" maxlength="128" placeholder="main" value="main"><p class="hint">同一会话保持连续上下文；换一个会话等于开一段新对话。</p>
<div class="pair"><div><label for="bridgeTextLimit">单条字数上限</label><input id="bridgeTextLimit" type="number" min="1" max="200" value="20"><p class="hint">输入与回复都按这个上限截断。</p></div><div><label for="bridgeTimeout">超时（毫秒）</label><input id="bridgeTimeout" type="number" min="5000" max="600000" step="1000" value="120000"><p class="hint">单次请求最多等多久。</p></div></div>
<label for="bridgeToken">配对令牌</label><div class="token-line"><div class="token-field"><input id="bridgeToken" type="text" autocomplete="off" placeholder="必须与插件 tokens 那一行等号左边一致" disabled><button type="button" id="bridgeTokenEye" class="token-eye" aria-label="显示或隐藏令牌"></button></div><button type="button" id="bridgeTokenGenerate" disabled>生成</button><button type="button" id="bridgeTokenEdit">修改</button></div><p class="hint">这里填插件配置里 <code>tokens</code> 那一行等号左边的值，用于让桌宠通过插件进入 AstrBot；与插件端必须完全一致。</p>
<div class="test-row"><button type="button" id="bridgeTest">测试连接</button><span id="bridgeResult" class="test-result" role="status" aria-live="polite"></span></div>
</fieldset>
<fieldset id="model-section"><legend class="model-legend"><span>模型连接</span><label class="switch"><input id="modelEnabled" type="checkbox" role="switch" aria-label="启用模型连接"><span class="slider" aria-hidden="true"></span></label></legend>
<p class="hint model-switch-note"><strong>开启：</strong>客户端直接调用下方模型 API，用于本机对话与自动碎碎念，会产生 API 费用。<br><strong>关闭：</strong>不调用本机模型，不产生费用；桌宠仍可显示、移动和互动，AstrBot 连接不受影响，自动碎碎念不可用。</p>
<div id="model-fields">
<label for="protocol">接口协议</label><select id="protocol" name="protocol"><option value="openai-compatible">OpenAI 兼容</option><option value="anthropic">Anthropic</option></select>
<label for="baseUrl">接口地址（Base URL）</label><input id="baseUrl" name="baseUrl" type="url" placeholder="https://example.com/v1" maxlength="2048" spellcheck="false" aria-describedby="endpoint-note"><p class="hint" id="endpoint-note">填写服务商提供的基础接口地址（支持 HTTP 与 HTTPS，通常以 /v1 结尾）。不要把密钥放进地址。</p>
<label for="model">模型名称</label><input id="model" name="model" type="text" maxlength="200" placeholder="填写服务商的模型 ID，例如 deepseek-chat" spellcheck="false">
<div class="key-heading"><label for="apiKey">API 密钥</label><span id="key-state" class="hint">尚未读取</span></div>
<div class="token-field"><input id="apiKey" name="apiKey" type="password" autocomplete="new-password" maxlength="8192" placeholder="留空保留已保存的密钥" aria-describedby="key-note"><button type="button" id="apiKeyEye" class="token-eye" aria-label="显示或隐藏密钥"></button></div>
<p id="key-note" class="hint">密钥只写入本机配置，不会回显。留空不会删除旧密钥。</p>

<div class="test-row"><button id="test-btn" type="button">测试连接</button><span id="test-result" class="test-result" role="status" aria-live="polite"></span></div>
</div>
</fieldset>
<fieldset><legend>定时自动碎碎念</legend>
<label class="check"><input id="automaticWhispers" type="checkbox" aria-describedby="cost">开启自动碎碎念</label>
<p id="cost" class="notice">开启后，桌宠会按设定间隔定时调用模型并在桌面上说话冒泡（产生 API 费用）。默认关闭；右键菜单中的手动对话与手动碎碎念不受此开关限制。</p>
<div class="pair"><div><label for="whisperIntervalSec">碎碎念间隔（秒）</label><input id="whisperIntervalSec" type="number" min="60" max="86400" step="1" value="300" required></div>
<div><label for="maxTokens">单次输出上限（tokens）</label><input id="maxTokens" type="number" min="128" max="4096" step="1" value="1024" required></div></div>
<p class="hint">间隔至少 60 秒，默认 300 秒。输出上限越小，单次回复越简短。</p>
</fieldset>
<footer><p id="privacy">所有配置与密钥仅保存在当前机器。<br>关闭 AI 后，桌宠仍可正常显示、移动与互动。</p><button id="save" type="submit" disabled>全局保存</button></footer>
<p id="status" role="status" aria-live="polite">正在读取本机设置…</p>
</form><noscript>需要启用 JavaScript 才能保存设置。请从桌宠菜单打开本页。</noscript></main></body></html>`;

/** 设置页样式。 */
export const settingsStyle = `
:root{color-scheme:light;--ink:#203b4b;--muted:#526a78;--blue:#12618b;--line:#cbdce5;--paper:#fff;--water:#edf5fa}
*{box-sizing:border-box}body{margin:0;background:var(--water);color:var(--ink);font:16px/1.6 "Microsoft YaHei UI","PingFang SC",sans-serif}
main{max-width:720px;margin:48px auto;padding:0 24px 32px}header{padding:0 12px 28px}.fish{display:block;font:700 29px/1.3 Georgia,serif;color:var(--blue);letter-spacing:2px;margin-bottom:24px}.local{font-size:13px;color:var(--muted);margin:0 0 10px}.local a{color:var(--blue)}h1{font-size:32px;line-height:1.3;letter-spacing:-1px;margin:0 0 16px;font-weight:700}.intro{margin:0;color:var(--muted)}
form{background:var(--paper);border:1px solid var(--line);border-radius:16px 16px 6px 6px;padding:28px 32px 20px}fieldset{padding:0 0 28px;margin:0 0 24px;border:0;border-bottom:1px solid var(--line);min-width:0}legend{font-size:19px;font-weight:700;margin-bottom:18px;padding:0}label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}input:not([type=checkbox]),select{display:block;width:100%;min-height:44px;border:1px solid #a5bdcb;border-radius:6px;background:#fff;color:var(--ink);padding:9px 12px;font:inherit;font-size:15px}input::placeholder{color:#6a7e8b}input[type=checkbox]{accent-color:var(--blue);width:18px;height:18px;flex-shrink:0;margin:0}.check{display:flex;align-items:center;gap:10px;min-height:32px;cursor:pointer}.enabled{margin-top:24px}.clear{font-weight:400;color:var(--muted);font-size:13px}.hint{font-size:12px;line-height:1.6;color:var(--muted);margin:7px 0 0}.key-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px}.key-heading label{margin:0 0 6px}.key-heading .hint{margin:0 0 6px}.notice{font-size:13px;color:#704b13;background:#fff7e7;border-left:3px solid #c18e36;margin:12px 0 16px;padding:12px 14px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}footer{display:flex;align-items:center;justify-content:space-between;gap:18px}footer p{font-size:12px;color:var(--muted);margin:0}button{border:0;border-radius:7px;min-height:44px;padding:10px 20px;background:var(--blue);color:#fff;font:600 15px/1.5 inherit;white-space:nowrap;cursor:pointer}button:hover{background:#0b4e73}button:disabled{opacity:.55;cursor:wait}:focus-visible{outline:3px solid #3a94c4;outline-offset:3px}#status{font-size:13px;min-height:24px;margin:18px 0 0;color:var(--blue)}#status[data-error=true]{color:#a13b30}
.test-row{display:flex;align-items:center;gap:14px;margin:20px 0 6px;flex-wrap:wrap}#test-btn,#bridgeTest{background:#fff;color:var(--blue);border:1.5px solid var(--blue);min-height:38px;padding:6px 18px;font-size:14px;border-radius:6px;cursor:pointer;font-weight:600}#test-btn:hover,#bridgeTest:hover{background:#edf5fa}#test-btn:disabled,#bridgeTest:disabled{opacity:.6;cursor:wait}.model-legend{display:flex;align-items:center;justify-content:space-between;gap:16px}.model-switch-note{margin:0 0 14px;line-height:1.7}.switch{position:relative;display:inline-flex;width:46px;height:26px;flex:0 0 auto;margin:0}.switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer;z-index:2}.switch .slider{width:100%;height:100%;border-radius:999px;background:#c7d2da;transition:background .18s}.switch .slider::after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .18s}.switch input:checked + .slider{background:var(--blue)}.switch input:checked + .slider::after{transform:translateX(20px)}.switch input:focus-visible + .slider{outline:3px solid #3a94c4;outline-offset:3px}#model-section.model-off #model-fields{opacity:.5}#model-section.model-off #model-fields *{cursor:not-allowed}.test-result{font-size:13px;line-height:1.5;min-height:22px;flex:0 1 auto}.test-success{color:#1a7f37;font-weight:600}.test-error{color:#cf222e}.reply-preview{display:block;color:var(--muted);font-weight:normal;font-size:12px;margin-top:4px;word-break:break-all}
.token-line{display:flex;gap:10px;align-items:center}.token-field{position:relative;flex:1}.token-field input{width:100%;padding-right:46px}.token-eye{position:absolute;right:7px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;background:transparent;color:var(--muted);cursor:pointer;border-radius:6px;display:grid;place-items:center}.token-eye:hover,.token-eye:active{background:transparent;color:var(--blue)}.token-eye:focus-visible{outline:2px solid var(--blue);outline-offset:1px}.token-line>button{min-height:38px;padding:6px 16px;background:#fff;color:var(--blue);border:1.5px solid var(--blue);font-size:14px}.token-line>button[hidden]{display:none}.token-line>button:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:560px){main{margin:24px auto;padding:0 14px 24px}header{padding:0 8px 24px}h1{font-size:28px}form{padding:24px 20px 16px}.pair{grid-template-columns:1fr;gap:0}footer{align-items:stretch;flex-direction:column}button{width:100%}.fish{margin-bottom:18px}}
`;

/** 设置页脚本；令牌只存在内存，请求时放进自定义头。 */
export const settingsScript = `
'use strict';
(() => {
  const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  history.replaceState(null, '', location.pathname);
  const get = id => document.getElementById(id);
  const form = get('settings');
  const status = get('status');
  const save = get('save');
  const testBtn = get('test-btn');
  const testResult = get('test-result');
  function message(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  async function request(method, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/standalone-ai/settings', {
        method, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: { 'X-DSH-Pet-Token': token, ...(body ? {'Content-Type': 'application/json'} : {}) },
        ...(body ? {body: JSON.stringify(body)} : {})
      });
      if (!response.ok) {
        if (response.status === 403) throw new Error('打开凭据已失效。请从桌宠菜单重新打开设置。');
        if (response.status === 429) throw new Error('保存过于频繁，请稍等一分钟再试。');
        throw new Error('设置未保存。请检查接口地址、模型名称与密钥，再重试。');
      }
      return response.json();
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('保存超时，请重试');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  function applyModelEnabled(on) {
    get('model-section').classList.toggle('model-off', !on);
    for (const id of ['protocol', 'baseUrl', 'model', 'apiKey', 'apiKeyEye', 'test-btn']) {
      get(id).disabled = !on;
    }
    // 自动碎碎念依赖模型，模型关闭时一并禁用。
    for (const id of ['automaticWhispers', 'whisperIntervalSec', 'maxTokens']) {
      get(id).disabled = !on;
    }
  }
  get('modelEnabled').addEventListener('change', () => {
    applyModelEnabled(get('modelEnabled').checked);
  });
  function populate(data) {
    for (const id of ['protocol','baseUrl','model','whisperIntervalSec','maxTokens']) {
      if (data[id] !== undefined) get(id).value = String(data[id]);
    }
    for (const id of ['automaticWhispers']) get(id).checked = data[id] === true;
    get('modelEnabled').checked = data.enabled === true;
    applyModelEnabled(get('modelEnabled').checked);
    get('key-state').textContent = data.hasKey ? '已保存 · 不回显' : '尚未设置';
    get('apiKey').value = '';
  }
  if (testBtn && testResult) {
    testBtn.addEventListener('click', async () => {
      testBtn.disabled = true;
      testResult.className = 'test-result';
      testResult.textContent = '正在测试连接，请稍候…';
      const input = {
        protocol: get('protocol').value,
        baseUrl: get('baseUrl').value.trim(),
        model: get('model').value.trim(),
        apiKey: get('apiKey').value.trim(),
      };
      try {
        const response = await fetch('/standalone-ai/test', {
          method: 'POST',
          credentials: 'omit',
          cache: 'no-store',
          headers: {
            'X-DSH-Pet-Token': token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });
        const data = await response.json();
        if (data.ok) {
          testResult.className = 'test-result test-success';
          testResult.textContent = '✓ ' + data.message;
          if (data.reply) {
            const preview = document.createElement('span');
            preview.className = 'reply-preview';
            preview.textContent = '回复: ' + data.reply;
            testResult.appendChild(preview);
          }
        } else {
          testResult.className = 'test-result test-error';
          testResult.textContent = '✗ ' + (data.message || data.error || '测试失败');
        }
      } catch (error) {
        testResult.className = 'test-result test-error';
        testResult.textContent = '✗ 请求异常：' + (error && error.message ? error.message : String(error));
      } finally {
        testBtn.disabled = false;
      }
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    save.disabled = true;
    message('正在保存到本机…');
    const input = {
      protocol: get('protocol').value, baseUrl: get('baseUrl').value.trim(), model: get('model').value.trim(),
      apiKey: get('apiKey').value,
      enabled: get('modelEnabled').checked, automaticWhispers: get('automaticWhispers').checked,
      whisperIntervalSec: Number(get('whisperIntervalSec').value), maxTokens: Number(get('maxTokens').value)
    };
    get('apiKey').value = '';
    try {
      // 全局保存：先热更新桥接配置，再保存 AI 设置。
      applyBridge(await bridgeRequest('/config', 'POST', bridgePatch()));
      populate(await request('POST', input));
      get('apiKey').disabled = false;
      message('已全局保存，桥接配置已热更新。');
    } catch (error) { message(error.message, true); }
    finally { save.disabled = false; }
  });
  const bridgeResult = get('bridgeResult');
  function bridgeMessage(text, error = false) {
    bridgeResult.className = 'test-result' + (error ? ' test-error' : ' test-success');
    bridgeResult.textContent = text;
  }
  async function bridgeRequest(path, method = 'GET', body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/standalone-settings' + path, {
        method, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: { 'X-DSH-Pet-Token': token, ...(body ? {'Content-Type': 'application/json'} : {}) },
        ...(body ? {body: JSON.stringify(body)} : {})
      });
      if (!response.ok) throw new Error(response.status === 401 ? '没有访问凭据' : 'HTTP ' + response.status);
      return response.json();
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('请求超时，请重试');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  let bridgeFullToken = '';
  let bridgeMaskedToken = '';
  let bridgeTokenEditing = false;
  let bridgeTokenVisible = false;
  function bridgePatch() {
    return {
      baseUrl: get('bridgeBaseUrl').value.trim() || 'http://127.0.0.1:18787',
      identityMode: get('bridgeIdentityMode').value,
      username: get('bridgeUsername').value.trim(),
      session: get('bridgeSession').value.trim(),
      textLimit: Number(get('bridgeTextLimit').value),
      timeoutMs: Number(get('bridgeTimeout').value),
      ...(bridgeTokenEditing && bridgeFullToken ? { token: bridgeFullToken } : {}),
    };
  }
  const EYE_OPEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_CLOSED = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>';
  function setBridgeEye(open) {
    get('bridgeTokenEye').innerHTML = open ? EYE_OPEN : EYE_CLOSED;
  }
  get('apiKeyEye').innerHTML = EYE_CLOSED;
  get('apiKeyEye').addEventListener('click', () => {
    const input = get('apiKey');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    get('apiKeyEye').innerHTML = show ? EYE_OPEN : EYE_CLOSED;
  });
  function syncBridgeIdentity() {
    const owner = get('bridgeIdentityMode').value === 'owner';
    get('bridgeUsernameLabel').textContent = owner ? 'QQ 号' : '身份名称';
    get('bridgeUsername').placeholder = owner ? '请输入QQ号' : '输入用户昵称';
    get('bridgeIdentityHint').textContent = owner
      ? 'QQ号模式：与 AstrBot 同一个你，历史与记忆跟 QQ 侧一致。'
      : '自定义模式：独立身份，短期上下文从零开始。';
    get('bridgeUsernameHint').textContent = owner
      ? '填你的 QQ 号；插件会以这个身份进入 AstrBot。'
      : '自定义名字；AstrBot 会把它当成新用户。';
  }
  function makeBridgeToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    return 'pet-' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  function startBridgeToken(auto) {
    bridgeTokenEditing = true;
    bridgeFullToken = makeBridgeToken();
    const input = get('bridgeToken');
    input.disabled = false;
    input.value = bridgeFullToken;
    input.type = 'text';
    bridgeTokenVisible = true;
    setBridgeEye(true);
    get('bridgeTokenEdit').hidden = false;
    get('bridgeTokenGenerate').disabled = false;
    bridgeMessage(auto ? '已自动生成配对令牌，保存后请手动复制' : '已生成新令牌，保存后请手动复制');
  }
  function setBridgeTokenLocked(config) {
    bridgeFullToken = config.token || '';
    bridgeMaskedToken = config.tokenMask || '';
    bridgeTokenEditing = false;
    bridgeTokenVisible = false;
    const input = get('bridgeToken');
    if (!config.hasToken) {
      startBridgeToken(true);
      return;
    }
    input.type = 'text';
    input.value = bridgeMaskedToken;
    input.disabled = true;
    setBridgeEye(false);
    get('bridgeTokenGenerate').disabled = true;
    get('bridgeTokenEdit').hidden = false;
  }
  function applyBridge(config) {
    get('bridgeBaseUrl').value = config.baseUrl || 'http://127.0.0.1:18787';
    get('bridgeIdentityMode').value = config.identityMode || 'token';
    get('bridgeUsername').value = config.username || '';
    get('bridgeSession').value = config.session || 'main';
    get('bridgeTextLimit').value = String(config.textLimit || 20);
    get('bridgeTimeout').value = String(config.timeoutMs || 120000);
    syncBridgeIdentity();
    setBridgeTokenLocked(config);
  }
  async function loadBridge() { applyBridge(await bridgeRequest('/config')); }
  get('bridgeIdentityMode').addEventListener('change', syncBridgeIdentity);
  get('bridgeTokenEye').addEventListener('click', () => {
    const input = get('bridgeToken');
    if (bridgeTokenEditing) {
      bridgeTokenVisible = input.type === 'password';
      input.type = bridgeTokenVisible ? 'text' : 'password';
      setBridgeEye(bridgeTokenVisible);
      return;
    }
    if (!bridgeFullToken) return;
    bridgeTokenVisible = !bridgeTokenVisible;
    input.value = bridgeTokenVisible ? bridgeFullToken : bridgeMaskedToken;
    setBridgeEye(bridgeTokenVisible);
  });
  get('bridgeTokenGenerate').addEventListener('click', () => {
    if (get('bridgeToken').disabled) return;
    startBridgeToken(false);
  });
  get('bridgeTokenEdit').addEventListener('click', () => {
    bridgeTokenEditing = true;
    const input = get('bridgeToken');
    input.disabled = false;
    input.value = '';
    input.type = 'password';
    bridgeTokenVisible = false;
    setBridgeEye(false);
    get('bridgeTokenEdit').hidden = false;
    get('bridgeTokenGenerate').disabled = false;
    input.focus();
  });
  get('bridgeTest').addEventListener('click', async () => {
    const button = get('bridgeTest');
    button.disabled = true;
    bridgeMessage('正在保存并测试连接，请稍候…');
    try {
      // 测试前先把当前表单写入 remote.json，未点「全局保存」也能测试。
      applyBridge(await bridgeRequest('/config', 'POST', bridgePatch()));
      const result = await bridgeRequest('/test', 'POST');
      bridgeMessage(result.ok ? '连接正常，插件在线' : (result.hint || '插件可达但未就绪（检查令牌/Key）'), !result.ok);
    } catch (error) { bridgeMessage(error.message, true); }
    finally { button.disabled = false; }
  });
  if (!token) { message('请从桌宠菜单或本机启动器打开设置，以获得本次运行的访问凭据。', true); return; }
  request('GET').then(data => { populate(data); save.disabled = false; message('设置只在本机保存。'); })
    .catch(error => message(error.message, true));
  loadBridge().catch(error => bridgeMessage('连接配置读取失败：' + error.message, true));
})();
`;
