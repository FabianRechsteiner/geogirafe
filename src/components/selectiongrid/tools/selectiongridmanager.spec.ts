import { describe, it, expect } from 'vitest';
import SelectionGridManager from './selectiongridmanager';

/**
 * @returns content from GridJS html method.
 */
const getHtmlContent = (vnode: any): string => {
  return vnode['props']['content'];
};

describe('SelectionGridManager', () => {
  // This tests if the formatCell method interprets HTML in a cell value correctly
  describe('formatCell', () => {
    it('should format hyperlink html', () => {
      const cell = '<a href="https://example.com">Link</a>';
      expect(getHtmlContent(SelectionGridManager.formatCell(cell, null, null))).toEqual(cell);
    });

    it('should format image html', () => {
      const cell = '<img src="https://example.com/image.jpg">';
      expect(getHtmlContent(SelectionGridManager.formatCell(cell, null, null))).toEqual(cell);
    });

    it('should format button html', () => {
      const cell = '<button>Click</button>';
      expect(getHtmlContent(SelectionGridManager.formatCell(cell, null, null))).toEqual(cell);
    });

    it('should not format if no html is present', () => {
      const cell = 'No HTML Present';
      expect(SelectionGridManager.formatCell(cell, null, null)).toBe(cell);
    });
  });
});
