/**
 * 设置页的 HTTP 处理：静态资源、状态、登录、配置读写。
 *
 * 只挂在独立模式的本机服务上；页面公开，配置读写要 Basic 登录（首次先设密码）。
 * 必须始终成立：令牌不回显、密码不落日志、保存失败不改内存里的旧配置。
 * @module dsh-pet/src/standalone/bridge-settings-handler
 */

import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { checkBasicAuth, hasClientPassword, setClientPassword } from './client-auth.ts';
import { BridgeController } from './bridge-controller.ts';
import { readBridgeSettings, saveBridgeSettings, type BridgeSettingsPatch } from './bridge-settings.ts';
import { bridgeSettingsPage, bridgeSettingsScript, bridgeSettingsStyle } from './settings-page-bridge.ts';
import { setTextLimit } from '../shared/text-clip.ts';

/** 处理结果：true 表示这个请求已由设置页接管。 */
export type BridgeSettingsHandler = (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean>;

/** 依赖。 */
export interface BridgeSettingsOptions {
  home: string;
  controller: BridgeController;
  log: (message: string) => void;
  /** 进程令牌；AI 设置页用它访问桥接配置，避免再登一次密码。 */
  securityToken?: string;
}

const MAX_BODY = 64 * 1024;

/** 创建设置页处理器。 */
export function createBridgeSettingsHandler(options: BridgeSettingsOptions): BridgeSettingsHandler {
  const { home, controller, log } = options;
  const securityToken = options.securityToken ?? '';

  /** Basic 密码或进程令牌，二选一即可。 */
  const authorized = (req: IncomingMessage): boolean => {
    if (checkBasicAuth(req.headers.authorization, home)) return true;
    if (!securityToken) return false;
    const supplied = req.headers['x-dsh-pet-token'];
    if (typeof supplied !== 'string' || supplied.length !== securityToken.length) return false;
    return timingSafeEqual(Buffer.from(supplied), Buffer.from(securityToken));
  };

  return async (req, res, url): Promise<boolean> => {
    const path = url.pathname;
    if (!path.startsWith('/standalone-settings')) return false;
    const method = req.method ?? 'GET';

    const assets: Record<string, readonly [string, string]> = {
      '/standalone-settings/': [bridgeSettingsPage, 'text/html; charset=utf-8'],
      '/standalone-settings/settings.js': [bridgeSettingsScript, 'text/javascript; charset=utf-8'],
      '/standalone-settings/settings.css': [bridgeSettingsStyle, 'text/css; charset=utf-8'],
    };
    const asset = assets[path];
    if (asset) {
      if (method !== 'GET' && method !== 'HEAD') return sendJson(res, 405, { error: 'method_not_allowed' });
      res.writeHead(200, {
        'content-type': asset[1],
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      });
      res.end(method === 'HEAD' ? undefined : asset[0]);
      return true;
    }

    if (path === '/standalone-settings/status' && method === 'GET') {
      return sendJson(res, 200, {
        hasPassword: hasClientPassword(home),
        authenticated: authorized(req),
      });
    }

    if (path === '/standalone-settings/password' && method === 'POST') {
      if (hasClientPassword(home) && !authorized(req)) {
        return unauthorized(res);
      }
      const body = await readJson(req);
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      try {
        setClientPassword(home, username, password);
      } catch (error) {
        return sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      log('[petlink] 设置页登录密码已更新');
      return sendJson(res, 200, { ok: true });
    }

    if (path === '/standalone-settings/test' && method === 'POST') {
      if (hasClientPassword(home) && !authorized(req)) {
        return unauthorized(res);
      }
      const ok = await controller.health();
      return sendJson(res, 200, { ok, configured: controller.configured });
    }

    if (path === '/standalone-settings/config') {
      if (hasClientPassword(home) && !authorized(req)) {
        return unauthorized(res);
      }
      if (method === 'GET') return sendJson(res, 200, readBridgeSettings(home, true));
      if (method === 'POST') {
        const body = await readJson(req);
        const patch: BridgeSettingsPatch = {
          ...(typeof body.baseUrl === 'string' ? { baseUrl: body.baseUrl } : {}),
          ...(typeof body.token === 'string' ? { token: body.token } : {}),
          ...(typeof body.username === 'string' ? { username: body.username } : {}),
          ...(body.identityMode === 'owner' || body.identityMode === 'custom'
            ? { identityMode: body.identityMode }
            : {}),
          ...(typeof body.session === 'string' ? { session: body.session } : {}),
          ...(typeof body.timeoutMs === 'number' ? { timeoutMs: body.timeoutMs } : {}),
          ...(typeof body.textLimit === 'number' ? { textLimit: body.textLimit } : {}),
        };
        try {
          const next = saveBridgeSettings(home, patch);
          controller.reload(next);
          setTextLimit(next.textLimit);
          log(`[petlink] 桥接设置已更新：${next.baseUrl}（${next.username}/${next.session}，${next.textLimit} 字）`);
          return sendJson(res, 200, readBridgeSettings(home, true));
        } catch (error) {
          return sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
        }
      }
      return sendJson(res, 405, { error: 'method_not_allowed' });
    }

    return sendJson(res, 404, { error: 'not_found' });
  };
}

function unauthorized(res: ServerResponse): true {
  res.writeHead(401, {
    'content-type': 'application/json; charset=utf-8',
    'www-authenticate': 'Basic realm="dsh-pet-settings"',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify({ error: 'unauthorized' }));
  return true;
}

function sendJson(res: ServerResponse, status: number, body: unknown): true {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
  return true;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let settled = false;
    const chunks: Buffer[] = [];
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      fn();
    };
    req.on('data', (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_BODY) {
        finish(() => reject(new Error('请求体过大')));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => {
      finish(() => {
        if (chunks.length === 0) {
          resolve({});
          return;
        }
        try {
          const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {});
        } catch {
          resolve({});
        }
      });
    });
    req.on('error', (error) => finish(() => reject(error)));
  });
}
