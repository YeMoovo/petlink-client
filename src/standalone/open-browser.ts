/**
 * 用系统默认浏览器打开设置页：首次启动设置登录密码时调用。
 *
 * 平台分派：Windows 用 `cmd /c start`，macOS 用 `open`，其余 `xdg-open`。
 * 必须始终成立：打不开只静默失败，不阻塞桌宠启动。
 * @module dsh-pet/src/standalone/open-browser
 */

import { spawn } from 'node:child_process';

/**
 * 打开外部 URL。
 * @param url - 只接受 http(s) 地址。
 */
export function openBrowser(url: string): void {
  if (!/^https?:\/\//i.test(url)) return;
  try {
    const platform = process.platform;
    const command = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open';
    const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* 打不开就算了，日志里另有提示 */
  }
}
