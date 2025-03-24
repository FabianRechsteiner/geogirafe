import { it, expect } from 'vitest';
import { getValidIndex, minMax, hexToRgbaArray, rgbStrToRgbaArray } from './utils';

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

it('converts a hex to an rgba array', () => {
  // Regular hex colors
  expect(hexToRgbaArray('#0033ff')).toEqual([0, 51, 255, 1]);
  expect(hexToRgbaArray('#379134')).toEqual([55, 145, 52, 1]);
  expect(hexToRgbaArray('#ffffff')).toEqual([255, 255, 255, 1]);
  expect(hexToRgbaArray('#000000')).toEqual([0, 0, 0, 1]);
  expect(hexToRgbaArray('#ab0000')).toEqual([171, 0, 0, 1]);

  // Shorthand hex colors
  expect(hexToRgbaArray('#fff')).toEqual([255, 255, 255, 1]);
  expect(hexToRgbaArray('#000')).toEqual([0, 0, 0, 1]);

  // Hex colors with alpha values
  expect(hexToRgbaArray('#43ff6494')).toEqual([67, 255, 100, 0.58]);
  expect(hexToRgbaArray('#1a6f6eeb')).toEqual([26, 111, 110, 0.92]);
  expect(hexToRgbaArray('#1a6f6e00')).toEqual([26, 111, 110, 0]);
  expect(hexToRgbaArray('#1a6f6eff')).toEqual([26, 111, 110, 1]);

  // Incorrect hex strings
  expect(hexToRgbaArray('#11hhiinn')).toBe(null);
  expect(hexToRgbaArray('#ee')).toBe(null);
  expect(hexToRgbaArray('#43ff64941')).toBe(null);
  expect(hexToRgbaArray('43ff6494')).toBe(null);
  expect(hexToRgbaArray('0')).toBe(null);
  expect(hexToRgbaArray('')).toBe(null);
});

it('converts an rgb string to an rgba array', () => {
  // Regular rgb / rgba colors
  expect(rgbStrToRgbaArray('rgb(0, 51, 255)')).toEqual([0, 51, 255, 1]);
  expect(rgbStrToRgbaArray('rgba(0, 51, 255, 0.6)')).toEqual([0, 51, 255, 0.6]);
  expect(rgbStrToRgbaArray('rgba(0, 51, 255, 0.0)')).toEqual([0, 51, 255, 0]);
  expect(rgbStrToRgbaArray('rgba(0, 51, 255, 1.0)')).toEqual([0, 51, 255, 1]);
  expect(rgbStrToRgbaArray('rgb(0,51,255)')).toEqual([0, 51, 255, 1]);
  expect(rgbStrToRgbaArray('rgb (0,51,255)')).toEqual([0, 51, 255, 1]);
  expect(rgbStrToRgbaArray('rgba(0,51,255)')).toEqual([0, 51, 255, 1]);
  expect(rgbStrToRgbaArray('rgb( 255, 255, 255 )')).toEqual([255, 255, 255, 1]);
  expect(rgbStrToRgbaArray('rgb( 0, 0, 0 )')).toEqual([0, 0, 0, 1]);
  expect(rgbStrToRgbaArray('rgb(50.5, 51.236894, 255.00)')).toEqual([51, 51, 255, 1]);
  expect(rgbStrToRgbaArray('rgb(50.499999999, 51.236894, 255.00)')).toEqual([50, 51, 255, 1]);

  // Invalid rgb strings
  expect(rgbStrToRgbaArray('rgb(0, 51, 256)')).toBe(null);
  expect(rgbStrToRgbaArray('rgb(0, 51, 255, 100)')).toBe(null);
  expect(rgbStrToRgbaArray('rgb(-50, 51, 255)')).toBe(null);
});
