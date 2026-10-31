import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveRuntimeHome } from './portable-home.ts';

test('显式 DSH_HOME 优先', () => {
  const result = resolveRuntimeHome({ env: { DSH_HOME: 'D:\\explicit' } });
  assert.equal(result.home, 'D:\\explicit');
  assert.equal(result.portable, false);
});

test('PETLINK_DATA_DIR 与打包目录按顺序生效', () => {
  const home = mkdtempSync(join(tmpdir(), 'petlink-home-'));
  try {
    const preferred = join(home, 'preferred');
    const packaged = join(home, 'packaged');
    const result = resolveRuntimeHome({
      env: { PETLINK_DATA_DIR: preferred, PORTABLE_EXECUTABLE_DIR: join(home, 'unused') },
      packagedDir: packaged,
    });
    assert.equal(result.home, preferred);
    assert.equal(result.portable, true);

    const portable = resolveRuntimeHome({
      env: { PORTABLE_EXECUTABLE_DIR: home },
      packagedDir: packaged,
    });
    assert.equal(portable.home, join(home, 'PetLinkData'));
    assert.equal(portable.portable, true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('目录不可写时回退并给出警告', () => {
  const home = mkdtempSync(join(tmpdir(), 'petlink-home-'));
  try {
    const blocker = join(home, 'blocker');
    writeFileSync(blocker, 'x');
    const fallback = join(home, 'fallback');
    const result = resolveRuntimeHome({
      env: { PETLINK_DATA_DIR: join(blocker, 'data') },
      fallback,
    });
    assert.equal(result.home, fallback);
    assert.equal(result.portable, false);
    assert.match(result.warning ?? '', /不可写/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
