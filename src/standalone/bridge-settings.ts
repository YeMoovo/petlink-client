/**
 * 桥接配置的读写：设置页改地址/令牌/字数时只走这里，不直接拼 remote.json。
 *
 * 保存是「合并 + 原子替换」：留空的令牌保持原值，未提交的字段不动。
 * 必须始终成立：写盘失败不破坏旧文件；返回值一定是校验后的配置。
 * @module dsh-pet/src/standalone/bridge-settings
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { bridgeConfigPath, loadBridgeConfig, type BridgeAgentConfig } from './bridge-config.ts';

/** 设置页可见的配置（令牌只回 hasToken）。 */
export interface BridgeSettingsView {
  id: string;
  baseUrl: string;
  hasToken: boolean;
  tokenMask: string;
  /** 明文令牌：只在已授权的设置页读取时返回，供「小眼睛」显示。 */
  token?: string;
  username: string;
  identityMode: 'owner' | 'token';
  session: string;
  timeoutMs: number;
  textLimit: number;
  configured: boolean;
}

/** 保存补丁；字段缺省 = 不改。 */
export interface BridgeSettingsPatch {
  baseUrl?: string;
  token?: string;
  username?: string;
  identityMode?: 'owner' | 'token';
  session?: string;
  timeoutMs?: number;
  textLimit?: number;
}

/** 读取当前配置视图；没有配置时 configured=false。
 * @param home - DSH_HOME。
 * @param includeToken - 是否带出明文令牌（仅已授权的设置页）。
 */
export function readBridgeSettings(home: string, includeToken = false): BridgeSettingsView {
  const loaded = loadBridgeConfig(home);
  if (!loaded.config) {
    return {
      id: 'astrbot-home',
      baseUrl: '',
      hasToken: false,
      tokenMask: '',
      username: '',
      identityMode: 'token',
      session: 'main',
      timeoutMs: 120000,
      textLimit: 20,
      configured: false,
    };
  }
  const config = loaded.config;
  return {
    id: config.id,
    baseUrl: config.baseUrl,
    hasToken: config.token.length > 0,
    tokenMask: maskToken(config.token),
    ...(includeToken ? { token: config.token } : {}),
    username: config.username,
    identityMode: config.identityMode,
    session: config.session,
    timeoutMs: config.timeoutMs,
    textLimit: config.textLimit,
    configured: true,
  };
}

/**
 * 合并并保存配置。
 * @param home - DSH_HOME。
 * @param patch - 要修改的字段；token 留空表示保留。
 * @returns 校验后的新配置。
 * @throws 地址非法 / 写盘失败 / 保存后仍无法解析。
 */
export function saveBridgeSettings(home: string, patch: BridgeSettingsPatch): BridgeAgentConfig {
  const file = bridgeConfigPath(home);
  const current = loadBridgeConfig(home).config;
  const baseUrl = (patch.baseUrl ?? current?.baseUrl ?? '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+/i.test(baseUrl)) {
    throw new Error('接口地址必须是 http(s) 地址，例如 http://127.0.0.1:18787');
  }
  const token = (patch.token ?? '').trim() || current?.token || '';
  if (!token) throw new Error('设备令牌不能为空');

  const timeoutMs = clamp(patch.timeoutMs ?? current?.timeoutMs ?? 120000, 5000, 600000);
  const textLimit = clamp(patch.textLimit ?? current?.textLimit ?? 20, 1, 200);
  // 身份输入框在页面上默认留空：空值表示「不改」，不能把已有身份清成 dsh_pet。
  const requestedUsername = typeof patch.username === 'string' ? patch.username.trim() : '';
  const username = requestedUsername || current?.username || 'dsh_pet';
  const next = {
    id: current?.id ?? 'astrbot-home',
    baseUrl,
    token,
    username,
    identityMode: patch.identityMode ?? current?.identityMode ?? 'token',
    session: (patch.session ?? current?.session ?? 'main').trim() || 'main',
    timeoutMs,
    textLimit,
  };

  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  writeFileSync(temp, JSON.stringify({ agent: next }, null, 2) + '\n', 'utf8');
  renameSync(temp, file);

  const loaded = loadBridgeConfig(home);
  if (!loaded.config) throw new Error(loaded.error ?? '保存后无法解析桥接配置');
  return loaded.config;
}

/** 读取原始文件是否已存在（用于判断首次启动）。 */
export function bridgeConfigExists(home: string): boolean {
  return existsSync(bridgeConfigPath(home));
}

/** 读原始文件文本，仅用于排障；不存在时返回空串。 */
export function readBridgeConfigText(home: string): string {
  try {
    return readFileSync(bridgeConfigPath(home), 'utf8');
  } catch {
    return '';
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** 令牌掩码：前 3 + 固定星号 + 后 3，便于核对是哪一条而不泄露全文。 */
function maskToken(token: string): string {
  if (!token) return '';
  if (token.length <= 6) return '******';
  return `${token.slice(0, 3)}*********${token.slice(-3)}`;
}
