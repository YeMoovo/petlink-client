import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateWhisper } from './whisper.ts';

const ctx = {
  agentDefaultModel: { currentSelection: () => ({ provider: 'local', model: 'local' }) },
};

test('桥接碎碎念走远端，并截到 20 字', async () => {
  const result = await generateWhisper(ctx, {
    system: '人设',
    bridge: { chat: async () => ({ text: '一'.repeat(40) }) },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal([...result.text].length, 20);
});

test('桥接碎碎念失败时返回结构化失败', async () => {
  const result = await generateWhisper(ctx, {
    system: '人设',
    bridge: {
      chat: async () => {
        throw new Error('连不上桌宠桥');
      },
    },
  });
  assert.equal(result.ok, false);
});
