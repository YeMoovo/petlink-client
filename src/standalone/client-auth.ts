/**
 * 设置页的登录凭据：用户名 + scrypt 密码哈希，存本机 `dsh-pet/client-auth.json`。
 *
 * 只服务设置页的 Basic 认证；不参与聊天/状态接口（那些仍用进程令牌）。
 * 必须始终成立：密码从不出现在磁盘、日志或响应里；比较使用定时安全。
 * @module dsh-pet/src/standalone/client-auth
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface AuthRecord {
  username: string;
  salt: string;
  hash: string;
}

/** 凭据文件路径。 */
export function clientAuthPath(home: string): string {
  return join(home, 'dsh-pet', 'client-auth.json');
}

/** 是否已经设置过登录密码。 */
export function hasClientPassword(home: string): boolean {
  return readRecord(home) !== undefined;
}

/**
 * 设置用户名与密码（覆盖旧值）。
 * @param home - DSH_HOME。
 * @param username - 登录名，非空。
 * @param password - 明文密码，至少 6 位。
 */
export function setClientPassword(home: string, username: string, password: string): void {
  const name = username.trim();
  if (!name) throw new Error('用户名不能为空');
  if (password.length < 6) throw new Error('密码至少 6 位');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  const directory = join(home, 'dsh-pet');
  mkdirSync(directory, { recursive: true });
  writeFileSync(clientAuthPath(home), JSON.stringify({ username: name, salt, hash }), { encoding: 'utf8' });
}

/**
 * 校验用户名与密码。
 * @returns 是否匹配。
 */
export function verifyClientPassword(home: string, username: string, password: string): boolean {
  const record = readRecord(home);
  if (!record) return false;
  if (record.username !== username.trim()) return false;
  try {
    const actual = scryptSync(password, record.salt, 64);
    const expected = Buffer.from(record.hash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * 解析并校验 `Authorization: Basic ...`。
 * @param header - 原始请求头。
 * @param home - DSH_HOME。
 * @returns 通过为 true；没设置密码时为 false（调用方按「首次设置」处理）。
 */
export function checkBasicAuth(header: string | undefined, home: string): boolean {
  if (!header || !header.toLowerCase().startsWith('basic ')) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const index = decoded.indexOf(':');
  if (index < 0) return false;
  return verifyClientPassword(home, decoded.slice(0, index), decoded.slice(index + 1));
}

/** 读凭据；文件不存在/损坏时返回 undefined。 */
function readRecord(home: string): AuthRecord | undefined {
  const file = clientAuthPath(home);
  if (!existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) as Partial<AuthRecord>;
    if (typeof parsed.username !== 'string' || typeof parsed.salt !== 'string' || typeof parsed.hash !== 'string') {
      return undefined;
    }
    return { username: parsed.username, salt: parsed.salt, hash: parsed.hash };
  } catch {
    return undefined;
  }
}
