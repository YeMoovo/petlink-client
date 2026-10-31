import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipText, TEXT_LIMIT } from './text-clip.ts';

test('短文本原样返回并 trim', () => {
  assert.equal(clipText('  在吗  '), '在吗');
});

test('恰好 20 字不截断', () => {
  const text = '一'.repeat(TEXT_LIMIT);
  assert.equal(clipText(text), text);
});

test('超长截到 20 字并以省略号结尾', () => {
  const text = '一'.repeat(30);
  const clipped = clipText(text);
  assert.equal([...clipped].length, TEXT_LIMIT);
  assert.ok(clipped.endsWith('…'));
});

test('按码点切，emoji 不会切坏', () => {
  const text = '🐟'.repeat(30);
  const clipped = clipText(text);
  assert.equal([...clipped].length, TEXT_LIMIT);
  assert.equal(clipped.endsWith('…'), true);
});
