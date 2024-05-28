import { it, expect, describe, beforeEach } from 'vitest';
import ResizeWindow from './resizewindow';

describe('Test resizeWindow class', () => {
  let rw: any;

  const getMockResizeWindow = (): ResizeWindow => {
    const fakeShadow = {
      querySelector: () => null,
      getRootNode: () => {
        return {
          host: ''
        };
      }
    };
    const rw: any = new ResizeWindow(fakeShadow as any as ShadowRoot);
    rw.top = 0;
    rw.left = 0;
    rw.minHeight = 100;
    rw.maxHeight = 500;
    rw.minWidth = 200;
    rw.maxWidth = 600;
    rw.height = 300;
    rw.width = 400;
    rw.originX = 1000;
    rw.originY = 1000;
    return rw;
  };

  beforeEach(() => {
    rw = getMockResizeWindow();
  });

  it('tests Mocking', () => {
    expect(rw.height).toBe(300);
  });

  describe('getNewSizeAndPosition', () => {
    describe('Set top', () => {
      it('tests in range', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 100, rw.originY + 100, 't');
        // Top and height with a diff of 100.
        expect(result).toEqual([rw.top + 100, rw.left, rw.height - 100, rw.width]);
      });

      it('tests with minHeight reached', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 1000, rw.originY + 1000, 't');
        const expectedDiffHeight = rw.height - rw.minHeight;
        // Top and height to min-height
        expect(result).toEqual([rw.top + expectedDiffHeight, rw.left, rw.height - expectedDiffHeight, rw.width]);
      });

      it('tests with maxHeight reached', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 1000, rw.originY - 1000, 't');
        const expectedDiffHeight = rw.maxHeight - rw.height;
        // Top and height to max-height
        expect(result).toEqual([rw.top - expectedDiffHeight, rw.left, rw.height + expectedDiffHeight, rw.width]);
      });
    });

    describe('Set bottom', () => {
      it('tests in range', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 100, rw.originY + 100, 'b');
        // Height with a diff of 100.
        expect(result).toEqual([rw.top, rw.left, rw.height + 100, rw.width]);
      });

      it('tests with minHeight reached', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 1000, rw.originY - 1000, 'b');
        const expectedDiffHeight = rw.height - rw.minHeight;
        // Height to min-height
        expect(result).toEqual([rw.top, rw.left, rw.height - expectedDiffHeight, rw.width]);
      });

      it('tests with maxHeight reached', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 1000, rw.originY + 1000, 'b');
        const expectedDiffHeight = rw.maxHeight - rw.height;
        // Height to max-height
        expect(result).toEqual([rw.top, rw.left, rw.height + expectedDiffHeight, rw.width]);
      });
    });

    describe('Set left', () => {
      it('tests in range', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 100, rw.originY + 100, 'l');
        // Left and width with a diff of 100.
        expect(result).toEqual([rw.top, rw.left + 100, rw.height, rw.width - 100]);
      });

      it('tests with minWidth reached', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 1000, rw.originY + 1000, 'l');
        const expectedDiffWidth = rw.width - rw.minWidth;
        // Left and width to min-width.
        expect(result).toEqual([rw.top, rw.left + expectedDiffWidth, rw.height, rw.width - expectedDiffWidth]);
      });

      it('tests with maxWidth reached', () => {
        const result = rw.getNewSizeAndPosition(rw.originX - 1000, rw.originY + 1000, 'l');
        const expectedDiffWidth = rw.width - rw.minWidth;
        // Left and width to max-width.
        expect(result).toEqual([rw.top, rw.left - expectedDiffWidth, rw.height, rw.width + expectedDiffWidth]);
      });
    });

    describe('Set right', () => {
      it('tests in range', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 100, rw.originY + 100, 'r');
        // Width with a diff of 100.
        expect(result).toEqual([rw.top, rw.left, rw.height, rw.width + 100]);
      });

      it('tests with minWidth reached', () => {
        const result = rw.getNewSizeAndPosition(rw.originX - 1000, rw.originY + 1000, 'r');
        const expectedDiffWidth = rw.width - rw.minWidth;
        // Width to max-width.
        expect(result).toEqual([rw.top, rw.left, rw.height, rw.width - expectedDiffWidth]);
      });

      it('tests with , maxWidth reached', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 1000, rw.originY + 1000, 'r');
        const expectedDiffWidth = rw.width - rw.minWidth;
        // Width to min-width.
        expect(result).toEqual([rw.top, rw.left, rw.height, rw.width + expectedDiffWidth]);
      });
    });

    describe('Set corner, in range', () => {
      it('tests top-left', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 100, rw.originY + 100, 'tl');
        // Width, height, top, left with a diff of 100.
        expect(result).toEqual([rw.top + 100, rw.left + 100, rw.height - 100, rw.width - 100]);
      });

      it('tests top-right', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 100, rw.originY + 100, 'tr');
        // Width, height and top with a diff of 100.
        expect(result).toEqual([rw.top + 100, rw.left, rw.height - 100, rw.width + 100]);
      });

      it('tests bottom-right', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 100, rw.originY + 100, 'br');
        // Width and height with a diff of 100.
        expect(result).toEqual([rw.top, rw.left, rw.height + 100, rw.width + 100]);
      });

      it('tests bottom-left', () => {
        const result = rw.getNewSizeAndPosition(rw.originX + 100, rw.originY + 100, 'bl');
        // Width, height, left with a diff of 100.
        expect(result).toEqual([rw.top, rw.left + 100, rw.height + 100, rw.width - 100]);
      });
    });
  });
});
