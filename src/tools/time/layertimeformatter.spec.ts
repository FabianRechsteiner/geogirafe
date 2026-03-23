// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import LayerTimeFormatter from './layertimeformatter';
import ITimeOptions from '../../tools/time/itimeoptions';

const MIN_DATE = '1900-01-01T00:00:00.000Z';
const MAX_DATE = '2100-01-01T00:00:00.000Z';

describe('LayerTimeFormatter', () => {
  const defaultOptions: ITimeOptions = {
    minValue: MIN_DATE,
    maxValue: MAX_DATE,
    minDefValue: null,
    maxDefValue: null,
    interval: [0, 0, 0, 0],
    resolution: 'day',
    mode: 'range',
    widget: 'datepicker'
  };

  it('should initialize with default options', () => {
    const timeRestriction = new LayerTimeFormatter(defaultOptions);

    expect(timeRestriction.minValue.toISOString()).toBe(MIN_DATE);
    expect(timeRestriction.maxValue.toISOString()).toBe(MAX_DATE);
    expect(timeRestriction.mode).toBe('range');
    expect(timeRestriction.resolution).toBe('day');
  });

  describe('formatTimeRestriction', () => {
    it('should set and return single value in value mode', () => {
      const options: ITimeOptions = { ...defaultOptions, mode: 'value' };
      const timeRestriction = new LayerTimeFormatter(options);

      const time = timeRestriction.formatDateString('2000-05-04');

      expect(time).toBe('2000-05-04');
    });

    it('should ignore invalid date for formatDateString', () => {
      const options: ITimeOptions = { ...defaultOptions, mode: 'value' };
      const timeRestriction = new LayerTimeFormatter(options);

      const time1 = timeRestriction.formatDateString('invalid-date');

      expect(time1).toBe('');

      const time2 = timeRestriction.formatDateString('');

      expect(time2).toBe('');
    });

    it('should set and return range in range mode', () => {
      const timeRestriction = new LayerTimeFormatter(defaultOptions);

      const time = timeRestriction.formatTimeRange('2000-01-01', '2000-12-31');

      expect(time).toBe('2000-01-01/2000-12-31');
    });

    it('should ignore invalid range dates', () => {
      const timeRestriction = new LayerTimeFormatter(defaultOptions);

      const time = timeRestriction.formatTimeRange('invalid-date', 'null');
      expect(time).toBe('');
    });

    it('should respect min and max values for range', () => {
      const options = {
        ...defaultOptions,
        minValue: '2000-01-01T00:00:00Z',
        maxValue: '2000-12-31T23:59:59Z'
      };
      const timeRestriction = new LayerTimeFormatter(options);

      const time = timeRestriction.formatTimeRange('1999-12-31', '2001-01-01');
      expect(time).toBe('');
    });

    it('should format week range', () => {
      // @ts-expect-error: private property
      const week = LayerTimeFormatter.formatAsWeekRange(new Date('2025-01-04T00:00:00Z')); // Saturday

      expect(week).toBe('2024-12-30/2025-01-05');
    });

    it('should format week range ignoring local time', () => {
      // @ts-expect-error: private property
      const week = LayerTimeFormatter.formatAsWeekRange(new Date('2025-01-05T23:59:59Z')); // Sunday night

      expect(week).toBe('2024-12-30/2025-01-05');
    });

    it('should format week range ignoring value mode', () => {
      const options: ITimeOptions = { ...defaultOptions, mode: 'value', resolution: 'week' };
      const timeRestriction = new LayerTimeFormatter(options);
      const week = timeRestriction.formatDateString(new Date('2025-01-05T23:59:59Z')); // Sunday night

      expect(week).toBe('2024-12-30/2025-01-05');
    });

    it('should format month value with month resolution', () => {
      const options: ITimeOptions = { ...defaultOptions, mode: 'value', resolution: 'month' };
      const timeRestriction = new LayerTimeFormatter(options);

      const time = timeRestriction.formatDateString('2025-01-31T23:59:59Z');

      expect(time).toBe('2025-01');
    });

    it('should format month range with month resolution', () => {
      const options: ITimeOptions = { ...defaultOptions, mode: 'range', resolution: 'month' };
      const timeRestriction = new LayerTimeFormatter(options);

      const time = timeRestriction.formatTimeRange('2025-02', '2025-03-31T12:56:33Z');

      expect(time).toBe('2025-02/2025-03');
    });

    it('should format year', () => {
      const options: ITimeOptions = { ...defaultOptions, mode: 'value', resolution: 'year' };
      const timeRestriction = new LayerTimeFormatter(options);

      const time = timeRestriction.formatDateString('2023-12-18T00:00:00Z');

      expect(time).toBe('2023');
    });

    it('should format year range', () => {
      const options: ITimeOptions = { ...defaultOptions, mode: 'range', resolution: 'year' };
      const timeRestriction = new LayerTimeFormatter(options);

      const time = timeRestriction.formatTimeRange('2023-02-18T00:00:00Z', '2026-10-18T00:00:00Z');

      expect(time).toBe('2023/2026');
    });

    it('should format year range 2', () => {
      const options: ITimeOptions = { ...defaultOptions, mode: 'range', resolution: 'year' };
      const timeRestriction = new LayerTimeFormatter(options);

      const time = timeRestriction.formatTimeRange('2000', '2020');

      expect(time).toBe('2000/2020');
    });
  });
});
