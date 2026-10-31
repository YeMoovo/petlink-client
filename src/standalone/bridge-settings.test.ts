import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readBridgeSettings, saveBridgeSettings } from './bridge-settings.ts';
import { BridgeController } from './bridge-controller.ts';

function tempHome(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-pet-bsettings-'));
}

test('保存并读取，令牌留空保持原值', () => {
  const home = tempHome();
  try {
    const first = saveBridgeSettings(home, {
      baseUrl: 'http://127.0.0.1:18787',
      token: 'secret-token',
      username: 'dsh_pet',
      session: 'main',
      textLimit: 30,
    });
    assert.equal(first.token, 'secret-token');
    assert.equal(first.textLimit, 30);

    const second = saveBridgeSettings(home, { baseUrl: 'http://127.0.0.1:18788', token: '' });
    assert.equal(second.baseUrl, 'http://127.0.0.1:18788');
    assert.equal(second.token, 'secret-token');
    assert.equal(second.textLimit, 30);

    const view = readBridgeSettings(home);
    assert.equal(view.configured, true);
    assert.equal(view.hasToken, true);
    assert.equal(view.textLimit, 30);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('字数与超时被夹到合法范围', () => {
  const home = tempHome();
  try {
    const config = saveBridgeSettings(home, {
      baseUrl: 'http://127.0.0.1:18787',
      token: 't',
      textLimit: 999,
      timeoutMs: 1,
    });
    assert.equal(config.textLimit, 200);
    assert.equal(config.timeoutMs, 5000);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('非法地址被拒绝', () => {
  const home = tempHome();
  try {
    assert.throws(() => saveBridgeSettings(home, { baseUrl: 'ftp://x', token: 't' }), /http\(s\)/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('控制器 reload 后 configured 跟着变', () => {
  const controller = new BridgeController(null);
  assert.equal(controller.configured, false);
  controller.reload({
    id: 'x',
    baseUrl: 'http://127.0.0.1:18787',
    token: 't',
    username: 'dsh_pet',
    identityMode: 'custom',
    session: 'main',
    timeoutMs: 5000,
    textLimit: 20,
  });
  assert.equal(controller.configured, true);
  controller.reload(null);
  assert.equal(controller.configured, false);
});
