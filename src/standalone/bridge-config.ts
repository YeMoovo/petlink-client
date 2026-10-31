/**
 * 远程大脑（桥接）配置：从 ~/.dsh/dsh-pet/remote.json 读取桌宠要连接的那一端。
 *
 * 只负责解析与校验，不发请求；环境变量可覆盖文件里的字段，方便临时切隧道/换令牌。
 * 必须始终成立：没有 baseUrl 或 token 时返回 null，绝不把空配置当成「已配置」。
 * @module dsh-pet/src/standalone/bridge-config
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 一个远程大脑的连接参数。 */
export interface BridgeAgentConfig {
  /** 便于多后端切换的标识，只用于日志。 */
  id: string;
  /** 例如 http://127.0.0.1:18787 或 https://pet.example.com。 */
  baseUrl: string;
  /** 设备令牌（不是 AstrBot 的 abk_ Key）。 */
  token: string;
  /** 在远端 AstrBot 里的身份。 */
  username: string;
  /** 身份模式：owner = 与 AstrBot 既有身份同一人；custom = 自定义新身份。 */
  identityMode: 'owner' | 'custom';
  /** 远端会话 id（relay 会加 pet: 前缀）。 */
  session: string;
  /** 单次请求超时。 */
  timeoutMs: number;
  /** 单条输入/回复的最大字符数。 */
  textLimit: number;
}

/** 读取结果：没有配置时 config 为 null，error 说明原因（只在文件存在但非法时给）。 */
export interface BridgeConfigResult {
  config: BridgeAgentConfig | null;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const MIN_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 600_000;
const DEFAULT_TEXT_LIMIT = 20;
const MIN_TEXT_LIMIT = 1;
const MAX_TEXT_LIMIT = 200;

/** remote.json 在 DSH_HOME 下的相对路径。 */
export function bridgeConfigPath(home: string): string {
  return join(home, 'dsh-pet', 'remote.json');
}

/**
 * 读取并校验桥接配置。
 * @param home - DSH_HOME。
 * @param env - 环境变量，便于测试与临时覆盖。
 * @returns 配置或 null；文件存在但非法时附带原因。
 */
export function loadBridgeConfig(home: string, env: NodeJS.ProcessEnv = process.env): BridgeConfigResult {
  const path = bridgeConfigPath(home);
  let raw: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      // 兼容 Windows 记事本/PowerShell 写出的 UTF-8 BOM：JSON.parse 不认它。
      const parsed: unknown = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { config: null, error: `${path} 不是 JSON 对象` };
      }
      const record = parsed as Record<string, unknown>;
      const agent = record.agent;
      raw = agent && typeof agent === 'object' && !Array.isArray(agent) ? (agent as Record<string, unknown>) : record;
    } catch (error) {
      return { config: null, error: `读取 ${path} 失败：${error instanceof Error ? error.message : String(error)}` };
    }
  }

  const baseUrl = text(env.DSH_PET_BRIDGE_URL ?? raw.baseUrl).replace(/\/+$/, '');
  const token = text(env.DSH_PET_BRIDGE_TOKEN ?? raw.token);
  if (!baseUrl && !token) return { config: null };
  if (!/^https?:\/\/[^/]+/i.test(baseUrl)) {
    return { config: null, error: 'baseUrl 必须是 http(s) 地址，例如 http://127.0.0.1:18787' };
  }
  if (!token) {
    return { config: null, error: '缺少设备令牌 token（remote.json 或 DSH_PET_BRIDGE_TOKEN）' };
  }

  const timeout = Number(env.DSH_PET_BRIDGE_TIMEOUT_MS ?? raw.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const textLimit = Number(env.DSH_PET_TEXT_LIMIT ?? raw.textLimit ?? DEFAULT_TEXT_LIMIT);
  return {
    config: {
      id: text(raw.id) || 'astrbot-home',
      baseUrl,
      token,
      username: text(env.DSH_PET_BRIDGE_USERNAME ?? raw.username) || 'dsh_pet',
      identityMode: raw.identityMode === 'owner' ? 'owner' : 'custom',
      session: text(env.DSH_PET_BRIDGE_SESSION ?? raw.session) || 'main',
      timeoutMs: Number.isFinite(timeout)
        ? Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.trunc(timeout)))
        : DEFAULT_TIMEOUT_MS,
      textLimit: Number.isFinite(textLimit)
        ? Math.min(MAX_TEXT_LIMIT, Math.max(MIN_TEXT_LIMIT, Math.trunc(textLimit)))
        : DEFAULT_TEXT_LIMIT,
    },
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
