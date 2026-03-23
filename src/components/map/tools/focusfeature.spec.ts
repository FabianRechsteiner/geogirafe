// SPDX-License-Identifier: Apache-2.0
import { expect, it, describe } from 'vitest';
import { FocusFeature } from './focusfeature';

describe('Function: getFlashDynamicValues', () => {
  it('Tests min result', () => {
    const frameStateTime = 2000;
    const duration = 2000;
    const expectedValues = [5, 1, 20];
    const actualValues = FocusFeature.getFlashDynamicValues(frameStateTime, duration);
    expect(actualValues).toEqual(expectedValues);
  });

  it('Tests max results', () => {
    const frameStateTime = 3999;
    const duration = 2000;
    const expectedValues = [30, 0, 39];
    const actualValues = FocusFeature.getFlashDynamicValues(frameStateTime, duration);
    expect(actualValues).toEqual(expectedValues);
  });

  it('Tests on half results', () => {
    const frameStateTime = 3000;
    const duration = 2000;
    const expectedValues = [26.875, 0.875, 30];
    const actualValues = FocusFeature.getFlashDynamicValues(frameStateTime, duration);
    expect(actualValues).toEqual(expectedValues);
  });
});
