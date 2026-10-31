import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBridgeSettingsHandler } from './bridge-settings-handler.ts';
import { BridgeController } from './bridge-controller.ts';

function tempHome(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-pet-handler-'));
}

class FakeResponse {
  status = 0;
  headers: Record<string, string> = {};
  body = '';
  writeHead(status: number, headers?: Record<string, string>): this {
    this.status = status;
    this.headers = headers ?? {};
    return this;
  }
  end(body?: string): void {
    this.body = body ?? '';
  }
}

function call(
  handler: ReturnType<typeof createBridgeSettingsHandler>,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<FakeResponse> {
  const req = Object.assign(
    Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]),
    { method, url: path, headers },
  ) as unknown as IncomingMessage;
  const res = new FakeResponse() as unknown as ServerResponse & FakeResponse;
  return handler(req, res, new URL(path, 'http://127.0.0.1')).then(() => res);
}

test('首次状态、设置密码、登录后读配置', async () => {
  const home = tempHome();
  try {
    const controller = new BridgeController(null);
    const handler = createBridgeSettingsHandler({ home, controller, log: () => {}, securityToken: 'run-token' });
    let res = await call(handler, 'GET', '/standalone-settings/status');
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(res.body).hasPassword, false);

    res = await call(handler, 'POST', '/standalone-settings/password', {
      username: 'owner',
      password: 'secret-123',
    }, { 'x-dsh-pet-token': 'run-token' });
    assert.equal(res.status, 200);

    res = await call(handler, 'GET', '/standalone-settings/config');
    assert.equal(res.status, 401);

    const basic = { authorization: 'Basic ' + Buffer.from('owner:secret-123').toString('base64') };
    res = await call(handler, 'GET', '/standalone-settings/config', undefined, basic);
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(res.body).configured, false);

    res = await call(
      handler,
      'POST',
      '/standalone-settings/config',
      {
        baseUrl: 'http://127.0.0.1:18787',
        token: 'device-token',
        username: 'dsh_pet',
        session: 'main',
        textLimit: 25,
      },
      basic,
    );
    assert.equal(res.status, 200);
    const saved = JSON.parse(res.body);
    assert.equal(saved.configured, true);
    assert.equal(saved.textLimit, 25);
    assert.equal(controller.configured, true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('未设置密码时允许直接写配置（首次引导）', async () => {
  const home = tempHome();
  try {
    const controller = new BridgeController(null);
    const handler = createBridgeSettingsHandler({ home, controller, log: () => {} });
    const res = await call(handler, 'POST', '/standalone-settings/config', {
      baseUrl: 'http://127.0.0.1:18787',
      token: 'device-token',
    });
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(res.body).configured, true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
