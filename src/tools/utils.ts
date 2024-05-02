/**
 * Checks if on Safari.
 * @returns True if on Safari.
 */
export const isSafari = () => {
  return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
};
