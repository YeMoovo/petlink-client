import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeChat } from './bridge-chat.ts';
import type { BridgeAgentConfig } from './bridge-config.ts';

const config: BridgeAgentConfig = {
  id: 'test',
  baseUrl: 'http://bridge.test',
  token: 'device-token',
  username: 'dsh_pet',
  identityMode: 'custom',
  session: 'main',
  timeoutMs: 10_000,
  textLimit: 20,
};

function sseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status, headers: { 'content-type': 'text/event-stream' } });
}

test('拼接 plain，忽略 reasoning/image/complete，并处理拆包', async () => {
  let seenBody = '';
  const fetcher: typeof fetch = async (_url, init) => {
    seenBody = String(init?.body ?? '');
    return sseResponse([
      'data: {"type":"session_id","session_id":"pet:map-1"}\n\n',
      ': ping\n\n',
      'data: {"type":"plain","data":"你',
      '"}\n\ndata: {"type":"reasoning","data":"ignore"}\n\n',
      'data: {"type":"plain","data":"好"}\n\n',
      'data: {"type":"image","data":"[IMAGE]x.gif"}\n\n',
      'data: {"type":"complete","data":"你好"}\n\n',
      'data: {"type":"end"}\n\n',
    ]);
  };
  const chat = createBridgeChat(config, { fetch: fetcher });
  const reply = await chat.chat('在吗', { session: 'selftest-1' });
  assert.equal(reply.text, '你好');
  assert.equal(reply.sessionId, 'pet:map-1');
  assert.deepEqual(JSON.parse(seenBody), {
    message: '在吗',
    session_id: 'selftest-1',
    username: 'dsh_pet',
    identity_mode: 'custom',
  });
});

test('非 2xx 抛出带状态码的错误', async () => {
  const fetcher: typeof fetch = async () => new Response('unauthorized', { status: 401 });
  const chat = createBridgeChat(config, { fetch: fetcher });
  await assert.rejects(() => chat.chat('hi'), /HTTP 401/);
});

test('没有任何文本时抛错，而不是返回空串', async () => {
  const fetcher: typeof fetch = async () =>
    sseResponse(['data: {"type":"image","data":"[IMAGE]x.gif"}\n\n', 'data: {"type":"end"}\n\n']);
  const chat = createBridgeChat(config, { fetch: fetcher });
  await assert.rejects(() => chat.chat('hi'), /没有返回任何文本/);
});

test('网络层失败时给出可行动的提示', async () => {
  const broken: typeof fetch = async () => {
    throw new TypeError('fetch failed');
  };
  const chat = createBridgeChat(config, { fetch: broken });
  await assert.rejects(() => chat.chat('hi'), /连不上桌宠桥/);
});

test('health 只看 ready 字段', async () => {
  const ready: typeof fetch = async () => new Response(JSON.stringify({ ready: true }), { status: 200 });
  assert.equal(await createBridgeChat(config, { fetch: ready }).health(), true);

  const notReady: typeof fetch = async () => new Response(JSON.stringify({ ready: false }), { status: 200 });
  assert.equal(await createBridgeChat(config, { fetch: notReady }).health(), false);

  const broken: typeof fetch = async () => {
    throw new Error('ECONNREFUSED');
  };
  assert.equal(await createBridgeChat(config, { fetch: broken }).health(), false);
});
