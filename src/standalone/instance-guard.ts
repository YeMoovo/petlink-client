/**
 * 单实例锁：保证一台机器上同一时间只有一只桌宠进程（CLI 与桌面应用共用一把锁）。
 *
 * 用 `wx` 原子创建锁文件；进程已死时自动接管。锁只防「多开」，不参与业务。
 * 必须始终成立：拿不到锁时返回原因而不是抛错；释放只删自己写的那把锁。
 * @module dsh-pet/src/standalone/instance-guard
 */

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** 锁文件里记录的持有者。 */
export interface InstanceHolder {
  pid: number;
  mode: string;
  startedAt: string;
}

/** 获取结果。 */
export type AcquireResult =
  | { ok: true; release: () => void }
  | { ok: false; reason: string; holder?: InstanceHolder };

/** 锁文件路径。 */
export function instanceLockPath(home: string): string {
  return join(home, 'dsh-pet', 'instance.lock');
}

/**
 * 获取单实例锁。
 * @param home - DSH_HOME。
 * @param mode - 启动形态，只用于日志（standalone / app）。
 * @returns 成功时带释放函数，失败时带原因与当前持有者。
 */
export function acquireInstanceLock(home: string, mode: string): AcquireResult {
  const directory = join(home, 'dsh-pet');
  mkdirSync(directory, { recursive: true });
  const file = instanceLockPath(home);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(
        file,
        JSON.stringify({ pid: process.pid, mode, startedAt: new Date().toISOString() }),
        { encoding: 'utf8', flag: 'wx' },
      );
      let released = false;
      return {
        ok: true,
        release: () => {
          if (released) return;
          released = true;
          try {
            const current = JSON.parse(readFileSync(file, 'utf8')) as { pid?: number };
            if (current.pid === process.pid) unlinkSync(file);
          } catch {
            /* 已被清理或损坏：不必再动 */
          }
        },
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') {
        return { ok: false, reason: `无法创建实例锁：${error instanceof Error ? error.message : String(error)}` };
      }
      const holder = readHolder(file);
      if (holder && isAlive(holder.pid)) {
        return {
          ok: false,
          holder,
          reason: `已有桌宠在运行（pid ${holder.pid}，模式 ${holder.mode}）`,
        };
      }
      // 持有者已退出：清掉陈旧锁再抢一次。
      try {
        unlinkSync(file);
      } catch {
        /* 别人先清了 */
      }
    }
  }
  return { ok: false, reason: '实例锁竞争失败，请稍后重试' };
}

/** 读锁文件；损坏时返回 undefined。 */
function readHolder(file: string): InstanceHolder | undefined {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<InstanceHolder>;
    if (typeof parsed.pid !== 'number' || !Number.isInteger(parsed.pid) || parsed.pid <= 0) return undefined;
    return {
      pid: parsed.pid,
      mode: typeof parsed.mode === 'string' ? parsed.mode : 'unknown',
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : '',
    };
  } catch {
    return undefined;
  }
}

/** 进程是否还活着；无权限时按存活处理，避免误抢。 */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
