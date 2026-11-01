/**
 * 远程大脑客户端：把桌宠的一句话发给桥，消费 SSE，返回一段文本。
 *
 * 只解析 data: 帧；plain 累加、end 结束，其余类型（reasoning / image / complete /
 * attachment_saved）一律忽略。注释帧（": ping"）天然被跳过。
 * 必须始终成立：非 2xx、空响应体、没有任何文本都抛错，不返回空字符串冒充成功。
 * @module dsh-pet/src/standalone/bridge-chat
 */

import type { BridgeAgentConfig } from './bridge-config.ts';

/** 一次桥调用的结果。 */
export interface BridgeReply {
  /** 拼接后的正文。 */
  text: string;
  /** 远端返回的会话 id（relay 会加 pet: 前缀）。 */
  sessionId?: string;
}

/** 宿主对话层需要的最小桥接口。 */
export interface BridgeChat {
  chat(text: string, options?: { session?: string; signal?: AbortSignal }): Promise<BridgeReply>;
  health(signal?: AbortSignal): Promise<boolean>;
  healthDetail?(signal?: AbortSignal): Promise<BridgeHealthDetail>;
}

/** /health 的可读结果：ready 之外把 auth_state / auth_hint 一起带回来。 */
export interface BridgeHealthDetail {
  ok: boolean;
  ready: boolean;
  authState?: string;
  tokenOk?: boolean;
  hint?: string;
}

/** 单次回复的硬上限：防止上游无限 plain 帧把内存吃爆。 */
const MAX_REPLY_CHARS = 200_000;

/** 单条 SSE 事件的回调；返回 false 表示停止读取。 */
export type SseHandler = (event: Record<string, unknown>) => boolean | void;

/** 依赖注入，便于单测。 */
export interface BridgeChatDeps {
  fetch?: typeof fetch;
}

/**
 * 按 SSE 分帧读取流，逐条回调。
 * @param stream - 响应体。
 * @param onEvent - 事件回调。
 * @param signal - 取消信号。
 */
export async function consumeSse(
  stream: ReadableStream<Uint8Array>,
  onEvent: SseHandler,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let stopped = false;
  const onAbort = (): void => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    while (!stopped) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let match = /\r?\n\r?\n/.exec(buffer);
      while (match) {
        const block = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        if (dispatchBlock(block, onEvent)) {
          stopped = true;
          break;
        }
        match = /\r?\n\r?\n/.exec(buffer);
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    try {
      reader.releaseLock();
    } catch {
      /* 已 cancel 时 release 可能抛，忽略 */
    }
  }
}

/** 解析一个 SSE 帧块；返回 true 表示调用方要求停止。 */
function dispatchBlock(block: string, onEvent: SseHandler): boolean {
  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const raw = line.slice(5).trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    if (onEvent(parsed as Record<string, unknown>) === false) return true;
  }
  return false;
}

/**
 * 创建桥客户端。
 * @param config - 连接参数。
 * @param deps - 可替换的 fetch。
 * @returns 可复用的客户端。
 */
export function createBridgeChat(config: BridgeAgentConfig, deps: BridgeChatDeps = {}): BridgeChat {
  const fetcher = deps.fetch ?? globalThis.fetch;
  const base = config.baseUrl.replace(/\/+$/, '');

  return {
    async chat(text, options = {}) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('timeout')), config.timeoutMs);
      const onAbort = (): void => controller.abort(options.signal?.reason);
      options.signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const response = await fetcher(`${base}/chat`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.token}`,
            'content-type': 'application/json',
            accept: 'text/event-stream',
          },
          body: JSON.stringify({
            message: text,
            session_id: options.session ?? config.session,
            username: config.username,
            identity_mode: config.identityMode,
          }),
          signal: controller.signal,
          redirect: 'error',
        });
        if (!response.ok) {
          const raw = (await response.text()).slice(0, 300);
          let detail = raw;
          try {
            const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown };
            detail = String(parsed.message ?? parsed.error ?? raw);
          } catch {
            /* 非 JSON 就回原文 */
          }
          if (/reserved for an AstrBot administrator/i.test(detail)) {
            detail = 'AstrBot 拒绝管理员身份。QQ号模式需要给 API Key 勾选 admin 权限，或改用自定义模式。';
          }
          throw new Error(`桥返回 HTTP ${response.status}${detail ? `：${detail}` : ''}`);
        }
        if (!response.body) throw new Error('桥返回空响应体');
        let reply = '';
        let sessionId: string | undefined;
        await consumeSse(
          response.body,
          (event) => {
            if (event.type === 'session_id' && typeof event.session_id === 'string') {
              sessionId = event.session_id;
            } else if (event.type === 'plain' && typeof event.data === 'string') {
              reply += event.data;
              if (reply.length > MAX_REPLY_CHARS) {
                throw new Error(`桥返回内容过长（超过 ${MAX_REPLY_CHARS} 字符）`);
              }
            } else if (event.type === 'end') {
              return false;
            }
          },
          controller.signal,
        );
        const trimmed = reply.trim();
        if (!trimmed) throw new Error('桥没有返回任何文本（可能只有图片或事件）');
        return sessionId ? { text: trimmed, sessionId } : { text: trimmed };
      } catch (error) {
        if (controller.signal.aborted && !options.signal?.aborted) {
          throw new Error(`桥请求超时（${config.timeoutMs}ms）`, { cause: error });
        }
        // fetch 在网络层失败时抛 TypeError：换成用户能看懂、能行动的一句话。
        if (error instanceof TypeError) {
          throw new Error('连不上桌宠桥：端口映射或 relay 可能已断开', { cause: error });
        }
        throw error instanceof Error ? error : new Error(String(error), { cause: error });
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', onAbort);
      }
    },

    async healthDetail(signal) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      const onAbort = (): void => controller.abort(signal?.reason);
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const response = await fetcher(`${base}/health?refresh=1`, {
          headers: { authorization: `Bearer ${config.token}` },
          signal: controller.signal,
          redirect: 'error',
        });
        if (!response.ok) {
          return { ok: false, ready: false, authState: `http_${response.status}`, hint: `插件 HTTP ${response.status}` };
        }
        const body: unknown = await response.json();
        const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
        return {
          ok: true,
          ready: record.ready === true,
          ...(typeof record.token_ok === 'boolean' ? { tokenOk: record.token_ok } : {}),
          ...(typeof record.auth_state === 'string' ? { authState: record.auth_state } : {}),
          ...(typeof record.auth_hint === 'string' ? { hint: record.auth_hint } : {}),
        };
      } catch (error) {
        return {
          ok: false,
          ready: false,
          authState: 'unreachable',
          hint: error instanceof Error ? error.message : String(error),
        };
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    },

    async health(signal) {
      return (await this.healthDetail?.(signal))?.ready === true;
    },
  };
}
