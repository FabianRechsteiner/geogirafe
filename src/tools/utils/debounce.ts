// SPDX-License-Identifier: Apache-2.0
/**
 * @param {T} func The function to debounce.
 * @param {number} wait The wait time in ms.
 * @returns {T} The wrapper function.
 * @template T
 */
export function debounce<T>(func: T, wait: number): T {
  let timeout: number | null = null;
  return function (...args: never) {
    const later = () => {
      timeout = null;
      // @ts-expect-error can't know type of T
      func.apply(this, args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait);
  } as unknown as T;
}
