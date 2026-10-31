import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireInstanceLock, instanceLockPath } from './instance-guard.ts';

function tempHome(): string {
  return mkdtempSync(join(tmpdir(), 'dsh-pet-lock-'));
}

test('同一 home 第二次获取会失败并给出持有者', () => {
  const home = tempHome();
  const first = acquireInstanceLock(home, 'standalone');
  assert.equal(first.ok, true);
  try {
    const second = acquireInstanceLock(home, 'app');
    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.equal(second.holder?.pid, process.pid);
      assert.match(second.reason, /已有桌宠在运行/);
    }
  } finally {
    if (first.ok) first.release();
    rmSync(home, { recursive: true, force: true });
  }
});

test('释放后可以重新获取', () => {
  const home = tempHome();
  try {
    const first = acquireInstanceLock(home, 'standalone');
    assert.equal(first.ok, true);
    if (first.ok) first.release();
    const again = acquireInstanceLock(home, 'standalone');
    assert.equal(again.ok, true);
    if (again.ok) again.release();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('持有者已死时接管陈旧锁', () => {
  const home = tempHome();
  try {
    mkdirSync(join(home, 'dsh-pet'), { recursive: true });
    const file = instanceLockPath(home);
    writeFileSync(file, JSON.stringify({ pid: 999999, mode: 'standalone', startedAt: '' }), 'utf8');
    const acquired = acquireInstanceLock(home, 'standalone');
    assert.equal(acquired.ok, true);
    if (acquired.ok) acquired.release();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
