import { it, expect } from 'vitest';
import { getValidIndex, minMax } from './utils';

it('tests getValidIndex function', () => {
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

it('tests minMax function', () => {
  expect(minMax(5, 10, 20)).toBe(10);
  // Test a case where value is more than maxLimit
  expect(minMax(25, 10, 20)).toBe(20);
  // Test a case where value is within the min and max limits
  expect(minMax(15, 10, 20)).toBe(15);
});
