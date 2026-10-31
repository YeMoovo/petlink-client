/**
 * 运行时数据目录解析：安装/解压盘优先，避免把配置写进 C 盘用户目录。
 *
 * 优先级：DSH_HOME（显式）→ PETLINK_DATA_DIR → PORTABLE_EXECUTABLE_DIR/PetLinkData
 * → 打包目录/PetLinkData → ~/.dsh。
 * 必须始终成立：只有确认可写才选盘符目录，写不了就回退并给出 warning，绝不静默丢配置。
 * @module dsh-pet/src/standalone/portable-home
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** 解析结果。 */
export interface RuntimeHome {
  home: string;
  /** 是否落在 exe 同盘的 PetLinkData。 */
  portable: boolean;
  /** 可写性探测失败时的回退说明。 */
  warning?: string;
}

/** 解析时的可覆盖输入，便于测试。 */
export interface RuntimeHomeOptions {
  env?: NodeJS.ProcessEnv;
  /** Electron 打包后 exe 所在目录（非 portable 形态时使用）。 */
  packagedDir?: string;
  /** 放置 petlink-data.txt 的 exe 目录；文件内容为数据目录绝对路径。 */
  exeDir?: string;
  /** 最终回退目录，默认 ~/.dsh。 */
  fallback?: string;
}

const DATA_FOLDER = 'PetLinkData';

/**
 * 解析运行时主目录。
 * @param options - 环境变量与打包目录覆盖。
 * @returns 目录、是否便携模式、以及回退警告。
 */
export function resolveRuntimeHome(options: RuntimeHomeOptions = {}): RuntimeHome {
  const env = options.env ?? process.env;

  // 便携/显式数据目录优先于 DSH_HOME：否则从 DSH 环境启动 portable 时会落回 C 盘。
  const candidates: Array<{ dir: string; portable: boolean }> = [];
  if (env.PETLINK_DATA_DIR) candidates.push({ dir: env.PETLINK_DATA_DIR, portable: true });
  if (env.PORTABLE_EXECUTABLE_DIR)
    candidates.push({ dir: join(env.PORTABLE_EXECUTABLE_DIR, DATA_FOLDER), portable: true });

  // 程序所在盘不可执行时，把程序放 C/D、数据继续放 J：exe 旁的 sidecar 指定数据目录。
  if (options.exeDir) {
    const sidecar = join(options.exeDir, 'petlink-data.txt');
    if (existsSync(sidecar)) {
      try {
        const target = readFileSync(sidecar, 'utf8').replace(/^\uFEFF/, '').trim();
        if (target) candidates.push({ dir: target, portable: true });
      } catch {
        /* 读不到就继续走便携默认路径 */
      }
    }
  }
  if (env.DSH_HOME) candidates.push({ dir: env.DSH_HOME, portable: false });
  if (options.packagedDir) candidates.push({ dir: join(options.packagedDir, DATA_FOLDER), portable: true });

  for (const candidate of candidates) {
    if (isWritable(candidate.dir)) return { home: candidate.dir, portable: candidate.portable };
  }

  const fallback = options.fallback ?? join(env.USERPROFILE || env.HOME || homedir(), '.dsh');
  return {
    home: fallback,
    portable: false,
    ...(candidates.length > 0
      ? { warning: `数据目录都不可写，已回退到 ${fallback}；设置 PETLINK_DATA_DIR 或换可写盘` }
      : {}),
  };
}

/** mkdir + 小文件试写；失败即认为该目录不可用。 */
function isWritable(directory: string): boolean {
  const probe = join(directory, `.write-test-${process.pid}`);
  try {
    mkdirSync(directory, { recursive: true });
    writeFileSync(probe, 'ok');
    unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}
