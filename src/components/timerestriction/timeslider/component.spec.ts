import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ITimeOptions from '../../../tools/time/itimeoptions';
import LayerTimeFormatter from '../../../tools/time/layertimeformatter';
import TimeSliderComponent from './component';
import MockHelper from '../../../tools/tests/mockhelper';
import IGirafeContext from '../../../tools/context/icontext';

const MIN_DATE = '1900-01-01T00:00:00.000Z';
const MAX_DATE = '2100-01-01T00:00:00.000Z';

describe('componentComponent', () => {
  let component: TimeSliderComponent;
  let context: IGirafeContext;
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

  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-time-slider')) {
      customElements.define('girafe-time-slider', TimeSliderComponent);
    }
    component = new TimeSliderComponent();
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  describe('dateStringToSliderPosition', () => {
    it('should return 0 for the minimum date', () => {
      component.initialize(defaultOptions);
      const steps = component['dateStringToSliderPosition'](MIN_DATE);
      expect(steps).toBe('0');
    });

    it('should return max step number for the maximum date', () => {
      const maxDate = '2000-04-10T00:00:00Z';
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-04-01T00:00:00Z',
        maxValue: maxDate
      };
      component.initialize(options);
      const steps = component['dateStringToSliderPosition'](maxDate);
      expect(steps).toBe('9');
    });

    it('should return 0 for an invalid date string', () => {
      component.initialize(defaultOptions);
      const steps = component['dateStringToSliderPosition']('invalid-date');
      expect(steps).toBe('0');
    });

    it('should return 0 for a date earlier than minValue', () => {
      component.initialize(defaultOptions);
      const steps = component['dateStringToSliderPosition']('1800-01-01T00:00:00.000Z');
      expect(steps).toBe('0');
    });

    it('should return max steps for a date later than maxValue', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-04-01T00:00:00Z',
        maxValue: '2000-04-10T00:00:00Z'
      };
      component.initialize(options);
      const steps = component['dateStringToSliderPosition']('2000-06-01T00:00:00Z');
      expect(steps).toBe('9');
    });

    it('should return correct step count for a date within the range', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-04-01T00:00:00Z',
        maxValue: '2000-04-30T00:00:00Z'
      };
      component.initialize(options);
      const testDate = '2000-04-15T00:00:00Z';
      const steps = component['dateStringToSliderPosition'](testDate);
      expect(steps).toBe('14');
    });
  });

  describe('sliderPositionToDateString', () => {
    it('should return the minimum date for slider position of 0', () => {
      component.initialize(defaultOptions);
      const date = component['sliderPositionToDateString']('0');
      expect(date).toBe(LayerTimeFormatter.formatAsDate(new Date(MIN_DATE)));
    });

    it('should return the maximum date for a step count equivalent to the max value', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-04-01T00:00:00Z',
        maxValue: '2000-04-30T00:00:00Z'
      };
      component.initialize(options);
      const date = component['sliderPositionToDateString']('29');
      expect(date).toBe('2000-04-30');
    });

    it('should return the midpoint date for half of the max steps', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-03-01T00:00:00Z',
        maxValue: '2000-04-01T00:00:00Z'
      };
      component.initialize(options);
      const date = component['sliderPositionToDateString']('15');
      expect(date).toBe('2000-03-16');
    });

    it('should handle negative steps by returning a date lower than minValue', () => {
      component.initialize(defaultOptions);
      const date = component['sliderPositionToDateString']('-1');
      expect(new Date(date).getTime()).toBeLessThan(new Date(MIN_DATE).getTime());
    });

    it('should return the correct date formatted as year when dealing with discrete time values form a list', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        resolution: 'year',
        minValue: '2000-01-01T00:00:00Z',
        maxValue: '2012-01-01T00:00:00Z',
        values: ['2000-01-01T00:00:00Z', '2003-01-01T00:00:00Z', '2004-01-01T00:00:00Z', '2012-01-01T00:00:00Z']
      };
      component.initialize(options);
      const date1 = component['sliderPositionToDateString']('0');
      expect(date1).toBe('2000');

      const date3 = component['sliderPositionToDateString']('3');
      expect(date3).toBe('2012');
    });

    it('should return the correct date formatted as day when dealing with with discrete time values form a list', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        resolution: 'day',
        minValue: '2000-01-12T00:00:00Z',
        maxValue: '2012-12-13T00:00:00Z',
        values: ['2000-01-12T00:00:00Z', '2003-02-16T00:00:00Z', '2004-10-19T00:00:00Z', '2012-12-13T00:00:00Z']
      };
      component.initialize(options);
      const date1 = component['sliderPositionToDateString']('1');
      expect(date1).toBe('2003-02-16');

      const date3 = component['sliderPositionToDateString']('2');
      expect(date3).toBe('2004-10-19');
    });
  });

  describe('countSliderStepsInRange', () => {
    it('should return correct slider length for "day" resolution', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-03-01T00:00:00Z',
        maxValue: '2000-04-01T00:00:00Z'
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(31);
    });

    it('should return correct step size for "day" resolution over multiple years', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2023-01-01T00:00:00Z', // 2023: Normal year
        maxValue: '2025-01-01T00:00:00Z', // 2024: Leap year
        resolution: 'day'
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(365 + 366);
    });

    it('should return correct step size for "week" resolution', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-01-01T00:00:00Z',
        maxValue: '2000-12-31T00:00:00Z',
        resolution: 'week'
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(52);
    });

    it('should return correct max step index for "month" resolution', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-01-01T00:00:00Z',
        maxValue: '2000-12-31T00:00:00Z',
        resolution: 'month'
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(11);
    });

    it('should return correct step size for "month" resolution ignoring local time', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-01-01T00:00:00Z',
        maxValue: '2000-12-31T23:59:59Z',
        resolution: 'month'
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(11);
    });

    it('should return a step size of 0 for "month"', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-06-01T00:00:00Z',
        maxValue: '2000-06-04T00:00:00Z',
        resolution: 'year'
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(0);
    });

    it('should return correct step size for "year" resolution', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-01-01T00:00:00Z',
        maxValue: '2021-01-01T00:00:00Z',
        resolution: 'year'
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(21);
    });

    it('should return a step size of 0 for "year"', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        minValue: '2000-01-01T00:00:00Z',
        maxValue: '2000-12-31T23:59:59Z',
        resolution: 'year'
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(0);
    });

    it('should return list length of discrete time values', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        resolution: 'day',
        values: ['2000-01-12T00:00:00Z', '2003-02-16T00:00:00Z', '2004-10-19T00:00:00Z', '2012-12-13T00:00:00Z']
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange();
      expect(stepSize).toBe(3);
    });

    it('should return list index of specified date', () => {
      const options: ITimeOptions = {
        ...defaultOptions,
        resolution: 'day',
        values: ['2000-01-12T00:00:00Z', '2003-02-16T00:00:00Z', '2004-10-19T00:00:00Z', '2012-12-13T00:00:00Z']
      };
      component.initialize(options);
      const stepSize = component.countSliderStepsInRange(new Date('2003-02-16'));
      expect(stepSize).toBe(1);
    });
  });
});
