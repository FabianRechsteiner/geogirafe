// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import SimpleMaskLayer from './simplemasklayer';

describe('SimpleMaskLayer', () => {
  describe('calculateBoxCorners', () => {
    it('correctly calculates corners of cut-out box', () => {
      // @ts-expect-error: private property
      let corners = SimpleMaskLayer.calculateBoxCorners(1000, 1000, 200, 400);
      expect(corners.length).toBe(4);
      expect(corners[0]).toEqual([400, 700]);
      expect(corners[2]).toEqual([600, 300]);

      // @ts-expect-error: private property
      corners = SimpleMaskLayer.calculateBoxCorners(1000, 1000, 1200, 1200);
      expect(corners.length).toBe(4);
      expect(corners[0]).toEqual([-100, 1100]);
      expect(corners[2]).toEqual([1100, -100]);
    });

    it('throws error if canvas size or cut-out size is less than 1', () => {
      // @ts-expect-error: private property
      expect(() => SimpleMaskLayer.calculateBoxCorners(0, 100, 200, 400)).toThrowError(
        'Both totalWidth and totalHeight must be greater than 0.'
      );
      // @ts-expect-error: private property
      expect(() => SimpleMaskLayer.calculateBoxCorners(1000, 1000, 0, 400)).toThrowError(
        'Both boxWidth and boxHeight must be greater than 0.'
      );
    });
  });
});
