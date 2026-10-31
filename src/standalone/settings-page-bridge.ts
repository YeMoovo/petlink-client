/**
 * 客户端设置页（桥接地址/令牌/字数）的静态资源：HTML、CSS、脚本。
 *
 * 页面本身公开，但配置读写要 Basic 登录（首次访问先设用户名/密码）。
 * 必须始终成立：脚本不把密码写进 URL/localStorage；令牌输入框不回显已保存值。
 * @module dsh-pet/src/standalone/settings-page-bridge
 */
export const bridgeSettingsPage = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PetLink</title><link rel="stylesheet" href="/standalone-settings/settings.css">
<script src="/standalone-settings/settings.js" defer></script></head><body>
<main><header><p class="local">PetLink / 本机设置</p><h1>PetLink</h1>
<p class="intro">本机设置页：登录后配置桌宠连接、模型与碎碎念。</p><p id="status" role="status" aria-live="polite"></p></header>
<section id="setup" hidden><h2>首次使用：设置登录密码</h2>
<p class="hint">密码只保存在本机，用于保护这个设置页。忘记后删除 <code>client-auth.json</code> 重新设置。</p>
<form id="setup-form"><label for="su-user">用户名</label><input id="su-user" autocomplete="username" required maxlength="64">
<label for="su-pass">密码（至少 8 位）</label><div class="token-field"><input id="su-pass" type="password" autocomplete="new-password" required minlength="8" maxlength="128"><button type="button" class="token-eye pass-eye" data-target="su-pass" aria-label="显示或隐藏密码"></button></div>
<div class="label-row"><label for="su-pass2">再次输入密码</label><span id="pass-mismatch" class="field-error" role="alert"></span></div><div class="token-field"><input id="su-pass2" type="password" autocomplete="new-password" required minlength="8" maxlength="128"><button type="button" class="token-eye pass-eye" data-target="su-pass2" aria-label="显示或隐藏密码"></button></div>
<button type="submit" class="setup-submit">设置并进入</button></form></section>
<section id="login" hidden><h2>登录</h2><form id="login-form"><label for="li-user">用户名</label><input id="li-user" autocomplete="username" required>
<label for="li-pass">密码</label><div class="token-field"><input id="li-pass" type="password" autocomplete="current-password" required><button type="button" class="token-eye pass-eye" data-target="li-pass" aria-label="显示或隐藏密码"></button></div>
<button type="submit" class="setup-submit">登录</button></form><p id="login-error" class="error" role="status"></p></section>
<section id="panel" hidden><h2>连接插件</h2>
<form id="cfg-form"><label for="baseUrl">插件地址（relay）</label><input id="baseUrl" type="url" placeholder="http://127.0.0.1:18787" maxlength="2048" spellcheck="false" required>
<p class="hint">AstrBot 插件监听的本机/隧道地址；换端口映射后只改这里。</p>
<label for="identityMode">身份模式</label><select id="identityMode"><option value="owner">QQ号模式</option><option value="token">自定义模式</option></select>
<p class="hint" id="identity-hint">参数一复用你现有的身份与上下文；参数二把桌宠当成一个新用户。</p>
<label for="username" id="username-label">QQ 号</label><input id="username" maxlength="128" placeholder="请输入QQ号">
<p class="hint" id="username-hint">填你的 QQ 号；插件会以这个身份进入 AstrBot。</p>
<label for="session">会话</label><input id="session" maxlength="128" placeholder="main">
<p class="hint">同一会话保持连续上下文；换一个会话等于开一段新对话。</p>
<div class="pair"><div><label for="textLimit">单条字数上限</label><input id="textLimit" type="number" min="1" max="200" required><p class="hint">输入与回复都按这个上限截断。</p></div>
<div><label for="timeoutMs">超时（毫秒）</label><input id="timeoutMs" type="number" min="5000" max="600000" step="1000" required><p class="hint">单次请求最多等多久。</p></div></div>
<label for="token">配对令牌</label>
<div class="token-line"><div class="token-field"><input id="token" type="text" maxlength="256" autocomplete="off" placeholder="必须与插件 tokens 那一行等号左边一致" disabled><button type="button" id="token-eye" class="token-eye" aria-label="显示或隐藏令牌"></button></div><button type="button" id="token-generate" disabled>生成</button><button type="button" id="token-edit">修改</button></div>
<p class="hint">这里填插件配置里 <code>tokens</code> 那一行等号左边的值，用于让桌宠通过插件进入 AstrBot；与插件端必须完全一致。</p>
<footer><button type="submit" id="save">保存并立即生效</button><button type="button" id="test">测试连接</button><span id="test-result" class="test-result" role="status" aria-live="polite"></span></footer>
</form>
<button type="button" id="logout">退出登录</button></section>
</main></body></html>`;

/** 设置页样式。 */
export const bridgeSettingsStyle = `
:root{color-scheme:light;--ink:#203b4b;--muted:#526a78;--blue:#12618b;--line:#cbdce5;--paper:#fff;--water:#edf5fa}
*{box-sizing:border-box}body{margin:0;background:var(--water);color:var(--ink);font:16px/1.6 "Microsoft YaHei UI","PingFang SC",sans-serif}
main{max-width:680px;margin:48px auto;padding:0 24px 40px}header{padding:0 12px 24px}.local{font-size:13px;color:var(--muted);margin:0 0 10px}h1{font-size:30px;margin:0 0 14px}.intro{margin:0;color:var(--muted)}
section{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:24px 28px;margin-bottom:20px}h2{font-size:20px;margin:0 0 16px}label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}input,select{display:block;width:100%;min-height:44px;border:1px solid #a5bdcb;border-radius:6px;padding:9px 12px;font:inherit;font-size:15px;background:#fff;color:var(--ink)}
.hint{font-size:12px;color:var(--muted);margin:7px 0 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}button{border:0;border-radius:7px;min-height:44px;padding:10px 20px;background:var(--blue);color:#fff;font:600 15px/1.5 inherit;cursor:pointer}button:hover{background:#0b4e73}.label-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.field-error{color:#a13b30;font-size:12px;font-weight:600;min-height:18px}.setup-submit{margin-top:18px}#test{background:#fff;color:var(--blue);border:1.5px solid var(--blue);margin-left:10px}#logout{background:#fff;color:var(--blue);border:1.5px solid var(--blue);margin-top:14px}
.token-line{display:flex;gap:8px;align-items:center}.token-field{position:relative;flex:1}.token-field input{width:100%;padding-right:44px}.token-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;background:transparent;color:var(--muted);cursor:pointer;border-radius:6px;display:grid;place-items:center}.token-eye:hover,.token-eye:active{background:transparent;color:var(--blue)}.token-eye:focus-visible{outline:2px solid var(--blue);outline-offset:1px}
.token-line>button{min-height:44px;padding:8px 16px;background:#fff;color:var(--blue);border:1.5px solid var(--blue)}.token-line>button[hidden]{display:none}.token-line>button:disabled{opacity:.45;cursor:not-allowed}
.test-result{font-size:13px;color:var(--muted)}.test-result.ok{color:#1a7f37;font-weight:600}.test-result.err{color:#a13b30}footer{margin-top:22px}#status{font-size:13px;min-height:22px;margin:14px 0 0;color:var(--blue)}#status[data-error=true]{color:#a13b30}.error{color:#a13b30;font-size:13px}
@media(max-width:560px){main{margin:24px auto;padding:0 14px 24px}section{padding:20px}.pair{grid-template-columns:1fr;gap:0}}`;

/** 设置页脚本；Basic 凭据只存在内存。 */
export const bridgeSettingsScript = `
'use strict';
(() => {
  const get = (id) => document.getElementById(id);
  let auth = '';
  // 首次设置密码也要带本次运行的令牌；URL 片段由启动器写入，只在内存里用一次。
  const pageToken = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  const el = { setup: get('setup'), login: get('login'), panel: get('panel'), status: get('status') };
  const b64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  };
  const headers = () => ({ ...(pageToken ? { 'X-DSH-Pet-Token': pageToken } : {}), ...(auth ? { Authorization: 'Basic ' + auth } : {}) });
  const show = (which) => { for (const key of ['setup', 'login', 'panel']) el[key].hidden = key !== which; };
  const fail = (error) => { el.status.textContent = String(error && error.message ? error.message : error); el.status.dataset.error = 'true'; };
  const ok = (text) => { el.status.textContent = text; el.status.dataset.error = 'false'; };

  async function request(path, options = {}) {
    const response = await fetch(path, {
      cache: 'no-store', redirect: 'error', ...options,
      headers: { 'Content-Type': 'application/json', ...headers(), ...(options.headers || {}) },
    });
    if (response.status === 401) throw new Error('用户名或密码不正确');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));
    return data;
  }

  async function readStatus() {
    const response = await fetch('/standalone-settings/status', { cache: 'no-store', headers: headers() });
    return response.json();
  }

  function syncIdentity() {
    const owner = get('identityMode').value === 'owner';
    get('username-label').textContent = owner ? 'QQ 号' : '身份名称';
    get('username').placeholder = owner ? '请输入QQ号' : '输入用户昵称';
    get('username-hint').textContent = owner
      ? '填你的 QQ 号；插件会以这个身份进入 AstrBot，复用同一段上下文。'
      : '自定义名字；AstrBot 会把它当成新用户，开一段新对话。';
    get('identity-hint').textContent = owner
      ? 'QQ号模式：与 AstrBot 同一个你，历史和记忆跟 QQ 侧一致。'
      : '自定义模式：独立身份，短期上下文从零开始。';
  }

  let fullToken = '';
  let maskedToken = '';
  let tokenEditing = false;
  let tokenVisible = false;
  const EYE_OPEN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_CLOSED = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>';
  function setEye(open) {
    get('token-eye').innerHTML = open ? EYE_OPEN : EYE_CLOSED;
  }

  for (const button of document.querySelectorAll('.pass-eye')) {
    button.innerHTML = EYE_CLOSED;
    button.addEventListener('click', () => {
      const input = get(button.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.innerHTML = show ? EYE_OPEN : EYE_CLOSED;
    });
  }

  function makeToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    return 'pet-' + Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function startToken(auto) {
    tokenEditing = true;
    fullToken = makeToken();
    const input = get('token');
    input.disabled = false;
    input.value = fullToken;
    input.type = 'text';
    tokenVisible = true;
    setEye(true);
    get('token-edit').hidden = false;
    get('token-generate').disabled = false;
    ok(auto ? '已自动生成配对令牌，保存后请手动复制' : '已生成新令牌，保存后请手动复制');
  }

  function setTokenLocked(config) {
    fullToken = config.token || '';
    maskedToken = config.tokenMask || '';
    tokenEditing = false;
    tokenVisible = false;
    const input = get('token');
    if (!config.hasToken) {
      // 首次使用：自动生成一套并填入，用户复制后点保存。
      startToken(true);
      return;
    }
    input.type = 'text';
    input.value = maskedToken;
    input.disabled = true;
    setEye(false);
    get('token-generate').disabled = true;
    // 修改始终可见；生成只在编辑态可用。
    get('token-edit').hidden = false;
  }

  function applyConfig(config) {
    get('baseUrl').value = config.baseUrl || '';
    get('identityMode').value = config.identityMode || 'token';
    get('username').value = '';
    get('session').value = config.session || 'main';
    get('textLimit').value = String(config.textLimit || 20);
    get('timeoutMs').value = String(config.timeoutMs || 120000);
    syncIdentity();
    setTokenLocked(config);
    show('panel');
  }

  async function loadConfig() {
    applyConfig(await request('/standalone-settings/config'));
  }

  get('identityMode').addEventListener('change', syncIdentity);

  get('token-eye').addEventListener('click', () => {
    const input = get('token');
    if (tokenEditing) {
      tokenVisible = input.type === 'password';
      input.type = tokenVisible ? 'text' : 'password';
      setEye(tokenVisible);
      return;
    }
    if (!fullToken) return;
    tokenVisible = !tokenVisible;
    input.value = tokenVisible ? fullToken : maskedToken;
    setEye(tokenVisible);
  });

  get('token-generate').addEventListener('click', () => {
    if (get('token').disabled) return;
    startToken(false);
  });

  get('token-edit').addEventListener('click', () => {
    tokenEditing = true;
    const input = get('token');
    input.disabled = false;
    input.value = '';
    input.type = 'password';
    tokenVisible = false;
    setEye(false);
    get('token-edit').hidden = false;
    get('token-generate').disabled = false;
    input.focus();
  });

  function goToAi() {
    location.replace('/standalone-ai/#token=' + encodeURIComponent(pageToken));
  }

  async function boot() {
    try {
      const status = await readStatus();
      if (!status.hasPassword) { show('setup'); return; }
      // 正常流程：持有进程令牌时直接进入唯一的 AI 设置页，不再展示第二个设置页。
      if (pageToken) { goToAi(); return; }
      if (!auth) { show('login'); return; }
      try {
        await loadConfig();
      } catch (error) {
        fail(error);
        show('login');
      }
    } catch (error) { fail(error); show('login'); }
  }

  get('su-pass2').addEventListener('input', () => {
    get('pass-mismatch').textContent = '';
  });

  get('setup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = get('su-user').value.trim();
    const password = get('su-pass').value;
    const mismatch = get('pass-mismatch');
    if (password !== get('su-pass2').value) {
      mismatch.textContent = '两次输入的密码不一致';
      get('su-pass2').focus();
      return;
    }
    mismatch.textContent = '';
    try {
      await request('/standalone-settings/password', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      auth = b64(username + ':' + password);
      if (pageToken) { goToAi(); return; }
      show('panel');
      try {
        await loadConfig();
        ok('密码已设置，可以继续填连接信息');
      } catch (error) {
        fail(error);
      }
    } catch (error) { fail(error); }
  });

  get('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    auth = b64(get('li-user').value.trim() + ':' + get('li-pass').value);
    if (pageToken) { goToAi(); return; }
    try { await loadConfig(); ok(''); } catch (error) { fail(error); show('login'); }
  });

  get('cfg-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const config = await request('/standalone-settings/config', {
        method: 'POST',
        body: JSON.stringify({
          baseUrl: get('baseUrl').value.trim(),
          identityMode: get('identityMode').value,
          username: get('username').value.trim(),
          session: get('session').value.trim(),
          textLimit: Number(get('textLimit').value),
          timeoutMs: Number(get('timeoutMs').value),
          ...(tokenEditing && fullToken ? { token: fullToken } : {}),
        }),
      });
      applyConfig(config);
      ok('已保存，立即生效');
    } catch (error) { fail(error); }
  });

  get('logout').addEventListener('click', () => { auth = ''; show('login'); });

  get('test').addEventListener('click', async () => {
    const resultLine = get('test-result');
    resultLine.textContent = '测试中…';
    resultLine.className = 'test-result';
    try {
      const result = await request('/standalone-settings/test', { method: 'POST' });
      resultLine.textContent = result.ok
        ? '连接正常'
        : (result.hint || (result.configured ? '插件可达但未就绪' : '尚未配置或连不上'));
      resultLine.className = 'test-result ' + (result.ok ? 'ok' : 'err');
    } catch (error) {
      resultLine.textContent = error.message;
      resultLine.className = 'test-result err';
    }
  });

  void boot();
})();`;
