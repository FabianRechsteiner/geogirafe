/**
 * Checks if on Safari.
 * @returns True if on Safari.
 */
export const isSafari = () => {
  return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
};

/**
 * Returns a valid index within the given maximum index.
 * Out of bound index loops back to the first valid index.
 * @param index - The index to validate.
 * @param maxIndex - The maximum index. If not provided or 0, returns 0.
 * @returns The valid index.
 */
export const getValidIndex = (index: number, maxIndex?: number): number => {
  if (!maxIndex) {
    return 0;
  }
  return index < 0 ? maxIndex : index % (maxIndex + 1);
};

/**
 * Returns a value bounded between a minimum and maximum limit.
 * @returns The bounded value.
 */
export const minMax = (value: number, minLimit: number, maxLimit: number): number => {
  return Math.min(Math.max(value, minLimit), maxLimit);
};
