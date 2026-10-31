import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateChat } from './chat.ts';

const ctx = {
  agentDefaultModel: { currentSelection: () => ({ provider: 'local', model: 'local-model' }) },
};

test('存在 bridge 时跳过本机模型，直接返回远端文本', async () => {
  const result = await generateChat({
    ctx,
    system: '人设',
    history: [],
    userText: '在吗',
    bridge: { chat: async (text: string) => ({ text: `远端：${text}` }) },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.text, '远端：在吗');
});

test('bridge 抛错时返回结构化失败，不伪造文案', async () => {
  const result = await generateChat({
    ctx,
    system: '人设',
    history: [],
    userText: '在吗',
    bridge: {
      chat: async () => {
        throw new Error('ECONNREFUSED');
      },
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'generate-error');
    assert.match(result.message ?? '', /ECONNREFUSED/);
  }
});

test('bridge 返回空白文本时按失败处理', async () => {
  const result = await generateChat({
    ctx,
    system: '人设',
    history: [],
    userText: '在吗',
    bridge: { chat: async () => ({ text: '   ' }) },
  });
  assert.equal(result.ok, false);
});
