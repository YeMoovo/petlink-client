import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkBasicAuth, hasClientPassword, setClientPassword, verifyClientPassword } from './client-auth.ts';

function tempHome(): string {
  return mkdtempSync(join(tmpdir(), 'petlink-auth-'));
}

test('设置后能校验通过，错误密码被拒', async () => {
  const home = tempHome();
  try {
    assert.equal(hasClientPassword(home), false);
    await setClientPassword(home, 'owner', 'secret-123');
    assert.equal(hasClientPassword(home), true);
    assert.equal(await verifyClientPassword(home, 'owner', 'secret-123'), true);
    assert.equal(await verifyClientPassword(home, 'owner', 'wrong'), false);
    assert.equal(await verifyClientPassword(home, 'other', 'secret-123'), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('Basic 头解析', async () => {
  const home = tempHome();
  try {
    await setClientPassword(home, 'owner', 'secret-123');
    const header = 'Basic ' + Buffer.from('owner:secret-123').toString('base64');
    assert.equal(await checkBasicAuth(header, home), true);
    assert.equal(await checkBasicAuth('Basic ' + Buffer.from('owner:nope').toString('base64'), home), false);
    assert.equal(await checkBasicAuth(undefined, home), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('密码少于 8 位被拒', async () => {
  const home = tempHome();
  try {
    await assert.rejects(() => setClientPassword(home, 'owner', '123'), /至少 8 位/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
