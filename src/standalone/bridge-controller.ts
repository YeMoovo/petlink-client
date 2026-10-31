/**
 * 可热替换的桥接客户端：设置页保存后 reload 一次，对话与碎碎念立刻走新地址。
 *
 * 持有当前 client 与配置；chat/health 只做转发，不缓存结果。
 * 必须始终成立：未配置时 chat 显式失败，health 返回 false，绝不假装成功。
 * @module dsh-pet/src/standalone/bridge-controller
 */

import { createBridgeChat, type BridgeChat, type BridgeReply } from './bridge-chat.ts';
import type { BridgeAgentConfig } from './bridge-config.ts';

/** 可热替换的 BridgeChat。 */
export class BridgeController implements BridgeChat {
  private client: BridgeChat | null = null;

  /** 当前生效的配置；未配置为 null。 */
  config: BridgeAgentConfig | null = null;

  constructor(config: BridgeAgentConfig | null) {
    this.reload(config);
  }

  /** 是否已配置远程大脑。 */
  get configured(): boolean {
    return this.client !== null;
  }

  /** 热替换：保存设置后调用，不需要重启进程。 */
  reload(config: BridgeAgentConfig | null): void {
    this.config = config;
    this.client = config ? createBridgeChat(config) : null;
  }

  chat(text: string, options?: { session?: string; signal?: AbortSignal }): Promise<BridgeReply> {
    if (!this.client) return Promise.reject(new Error('未配置远程大脑'));
    return this.client.chat(text, options);
  }

  health(signal?: AbortSignal): Promise<boolean> {
    return this.client ? this.client.health(signal) : Promise.resolve(false);
  }

  /** 代查余额：插件持有上游 Key，客户端只拿归一化钱包。 */
  async balance(signal?: AbortSignal): Promise<{
    ok: true;
    shape: 'money';
    wallets: Array<{ currency: string; total: string; granted: string; toppedUp: string }>;
  }> {
    if (!this.config) throw new Error('未配置远程大脑');
    const response = await fetch(`${this.config.baseUrl}/balance`, {
      headers: { authorization: `Bearer ${this.config.token}` },
      signal,
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || body.ok !== true) {
      throw new Error(String(body.error ?? `balance HTTP ${response.status}`));
    }
    return body as { ok: true; shape: 'money'; wallets: Array<{ currency: string; total: string; granted: string; toppedUp: string }> };
  }
}
