/**
 * 文本截断：桌宠的对话与碎碎念都限制在 20 个字符内，避免长文本把气泡 UI 撑坏。
 *
 * 按 Unicode 码点切，不按 UTF-16 长度切——emoji 与中文混排时不会切出半个代理对。
 * 超出时保留 19 个字符 + 省略号，总长仍是 20。
 * @module dsh-pet/src/shared/text-clip
 */

/** 单条消息/回复的最大字符数（默认值，可被设置页覆盖）。 */
export const TEXT_LIMIT = 20;

/** 当前生效的上限：设置页保存后调用 setTextLimit 热更新。 */
let currentLimit = TEXT_LIMIT;

/**
 * 设置当前上限（热更新，不需要重启）。
 * @param limit - 1–200 的整数；非法值忽略。
 */
export function setTextLimit(limit: number): void {
  if (!Number.isFinite(limit)) return;
  const value = Math.trunc(limit);
  if (value < 1 || value > 200) return;
  currentLimit = value;
}

/** 读取当前上限。 */
export function getTextLimit(): number {
  return currentLimit;
}

/**
 * 截断到指定字符数。
 * @param text - 原文。
 * @param limit - 最大字符数，缺省用当前生效值。
 * @returns 截断后的文本（超长时以 … 结尾）。
 */
export function clipText(text: string, limit: number = currentLimit): string {
  const chars = [...text.trim()];
  if (chars.length <= limit) return chars.join('');
  if (limit <= 0) return '';
  return chars.slice(0, limit - 1).join('') + '…';
}
