// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CsvManager from './csvmanager';
import { download } from './download';
import MockHelper from '../tests/mockhelper';
import IGirafeContext from '../context/icontext';

vi.mock('./download', () => ({
  download: vi.fn()
}));

describe('CsvManager', () => {
  let csvManager: CsvManager;
  let context: IGirafeContext;

  beforeEach(() => {
    context = MockHelper.startMocking();
    csvManager = new CsvManager(context);
  });

  describe('generateCsv', () => {
    it('should return empty string if data or columnDefs are empty', () => {
      // @ts-expect-error: private property
      expect(csvManager.generateCsv([], [])).toBe('');
      // @ts-expect-error: private property
      expect(csvManager.generateCsv([{ a: 1 }], [])).toBe('');
      // @ts-expect-error: private property
      expect(csvManager.generateCsv([], [{ name: 'a' }])).toBe('');
    });

    it('should generate CSV with headers', () => {
      const data = [{ a: 1, b: 2 }];
      const columnDefs = [{ name: 'a' }, { name: 'b' }];

      const expectedCsv = "'translated_a';'translated_b'\n'1';'2'\n";
      // @ts-expect-error: private property
      expect(csvManager.generateCsv(data, columnDefs)).toBe(expectedCsv);
    });

    it('should generate CSV without headers if config.csv.includeHeader is false', () => {
      const data = [{ a: 1, b: 2 }];
      const columnDefs = [{ name: 'a' }, { name: 'b' }];

      context.configManager.Config.csv.includeHeader = false;

      const expectedCsv = "'1';'2'\n";
      // @ts-expect-error: private property
      expect(csvManager.generateCsv(data, columnDefs)).toBe(expectedCsv);
    });
  });

  describe('getRow', () => {
    it('should generate CSV row with correct quoting and escaping', () => {
      const values = ['value1', 'value, with, commas', 'value "with" quotes', "other value 'with' quotes"];
      const expectedRow = `'value1';'value, with, commas';'value "with" quotes';'other value ''with'' quotes'\n`;
      // @ts-ignore
      expect(csvManager.getRow(values)).toBe(expectedRow);
    });

    it('should handle undefined and null values correctly', () => {
      const values = ['value1', undefined, null];
      const expectedRow = "'value1';;\n";
      // @ts-ignore
      expect(csvManager.getRow(values)).toBe(expectedRow);
    });
  });

  describe('startDownload', () => {
    it('should generate CSV and start download', () => {
      const data = [{ a: 1, b: 2 }];
      const columnDefs = [{ name: 'a' }, { name: 'b' }];
      const fileName = 'test_file';

      csvManager.startDownload(data, columnDefs, fileName);

      const expectedCsv = "'translated_a';'translated_b'\n'1';'2'\n";
      expect(download).toHaveBeenCalledWith(expectedCsv, fileName, 'text/csv;charset=utf-8');
    });
  });
});
