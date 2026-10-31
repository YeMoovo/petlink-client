import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBridgeConfig } from './bridge-config.ts';

function tempHome(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-pet-bridge-'));
}

test('没有 remote.json 时返回 null', () => {
  const home = tempHome();
  try {
    assert.equal(loadBridgeConfig(home, {}).config, null);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('读取 agent 段并补默认值', () => {
  const home = tempHome();
  try {
    mkdirSync(join(home, 'dsh-pet'), { recursive: true });
    writeFileSync(
      join(home, 'dsh-pet', 'remote.json'),
      JSON.stringify({
        agent: {
          id: 'home',
          baseUrl: 'http://127.0.0.1:18787/',
          token: 't-1',
          username: 'dsh_pet',
          session: 'main',
          timeoutMs: 90000,
        },
      }),
    );
    const result = loadBridgeConfig(home, {});
    assert.equal(result.error, undefined);
    assert.deepEqual(result.config, {
      id: 'home',
      baseUrl: 'http://127.0.0.1:18787',
      token: 't-1',
      username: 'dsh_pet',
      identityMode: 'custom',
      session: 'main',
      timeoutMs: 90000,
      textLimit: 20,
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('环境变量覆盖文件字段', () => {
  const home = tempHome();
  try {
    mkdirSync(join(home, 'dsh-pet'), { recursive: true });
    writeFileSync(
      join(home, 'dsh-pet', 'remote.json'),
      JSON.stringify({ baseUrl: 'http://old.test', token: 'old', session: 'a' }),
    );
    const result = loadBridgeConfig(home, {
      DSH_PET_BRIDGE_URL: 'https://new.test/',
      DSH_PET_BRIDGE_TOKEN: 'new',
      DSH_PET_BRIDGE_SESSION: 'b',
    });
    assert.equal(result.config?.baseUrl, 'https://new.test');
    assert.equal(result.config?.token, 'new');
    assert.equal(result.config?.session, 'b');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('缺少 token 或 baseUrl 非法时给出原因', () => {
  const home = tempHome();
  try {
    mkdirSync(join(home, 'dsh-pet'), { recursive: true });
    writeFileSync(join(home, 'dsh-pet', 'remote.json'), JSON.stringify({ token: 'only-token' }));
    const missingUrl = loadBridgeConfig(home, {});
    assert.equal(missingUrl.config, null);
    assert.match(missingUrl.error ?? '', /baseUrl/);

    writeFileSync(join(home, 'dsh-pet', 'remote.json'), JSON.stringify({ baseUrl: 'http://x.test' }));
    const missingToken = loadBridgeConfig(home, {});
    assert.equal(missingToken.config, null);
    assert.match(missingToken.error ?? '', /token/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('兼容带 UTF-8 BOM 的 remote.json', () => {
  const home = tempHome();
  try {
    mkdirSync(join(home, 'dsh-pet'), { recursive: true });
    writeFileSync(
      join(home, 'dsh-pet', 'remote.json'),
      '\uFEFF' + JSON.stringify({ baseUrl: 'http://127.0.0.1:18787', token: 't' }),
    );
    const result = loadBridgeConfig(home, {});
    assert.equal(result.error, undefined);
    assert.equal(result.config?.token, 't');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
