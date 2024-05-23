import { it, expect } from 'vitest';
import { getValidIndex } from './utils';

it('getValidIndex function', async () => {
  // Test a case where maxIndex is not provided or 0
  expect(getValidIndex(5)).toBe(0);
  expect(getValidIndex(5, 0)).toBe(0);
  // Test a case where index is negative
  expect(getValidIndex(-1, 5)).toBe(5);
  // Test a case where index >= 0 and less than or equal to maxIndex
  expect(getValidIndex(2, 5)).toBe(2);
  // Test a case where index is more than maxIndex
  expect(getValidIndex(6, 5)).toBe(0);
});
