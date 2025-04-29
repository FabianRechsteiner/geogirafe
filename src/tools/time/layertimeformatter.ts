import ITimeOptions, { TimeMode, TimeResolution } from './itimeoptions';


// In ISO 8601 format
const MIN_DATE = '1900-01-01T00:00:00.000Z';
const MAX_DATE = '2100-01-01T00:00:00.000Z';


/**
 * A class for formatting date and time values based on an `ITimeOption` object.
 * Provides utility functions for parsing dates and date ranges, validating them,
 * and generating formatted query strings for temporal layer filtering.
 *
 * The class allows customized configurations through its constructor options, including setting
 * minimum and maximum date bounds, default values, resolution levels, and operation modes.
 */
class LayerTimeFormatter {
  public minValue: Date;
  public maxValue: Date;
  public resolution: TimeResolution;
  public mode: TimeMode;
  public minDefaultValue?: Date;
  public maxDefaultValue?: Date;

  constructor(options?: ITimeOptions) {
    this.minValue = new Date(options?.minValue ?? MIN_DATE);
    this.maxValue = new Date(options?.maxValue ?? MAX_DATE);
    this.resolution = options?.resolution ?? 'month';
    this.mode = options?.mode ?? 'range';

    this.minDefaultValue = options?.minDefValue ? new Date(options?.minDefValue) : undefined;
    this.maxDefaultValue = options?.maxDefValue ? new Date(options?.maxDefValue) : undefined;
  }

  /**
   * Receives a date string or date object, validates it against the specified time options,
   * and generates a formatted query string for usage as URL query parameter.
   *
   * @param {string|Date} date - The date-like string or date object to be parsed and converted.
   * @return {string} A formatted query string, or an empty string if the date is invalid.
   */
  public formatDateString(date: string | Date): string {
    let dateObject: Date | undefined;
    if (typeof date === 'string') {
      dateObject = this.parseDateString(date);
    } else {
      dateObject = date;
    }
    if (dateObject && this.isWithinRange(dateObject)) {
      return LayerTimeFormatter.queryStringFromSingleValueAndResolution(dateObject, this.resolution);
    }
    return '';
  }

  /**
   * Generates a formatted query string from a provided date range for usage as URL query parameter.
   * The provided dates are shortened to fit the defined resolution.
   *
   * @param lowerLimit The lower bound of the time range as a date-like string or date object.
   * @param upperLimit The upper bound of the time range as a date-like string or date object.
   * @return A formatted query string, or an empty string if the dates are invalid.
   */
  public formatTimeRange(lowerLimit: string | Date, upperLimit: string | Date): string {
    if (this.mode === 'range') {
      let lowerDate: Date | undefined;
      let upperDate: Date | undefined;
      if (typeof lowerLimit === 'string') {
        lowerDate = this.parseDateString(lowerLimit);
      } else {
        lowerDate = lowerLimit;
      }
      if (typeof upperLimit === 'string') {
        upperDate = this.parseDateString(upperLimit);
      } else {
        upperDate = upperLimit;
      }
      if (lowerDate && this.isWithinRange(lowerDate) && upperDate && this.isWithinRange(upperDate)) {
        return LayerTimeFormatter.queryStringFromDateRangeAnResolution(lowerDate, upperDate, this.resolution);
      }
    }
    return '';
  }

  /**
   * Simple date transform method from a date-like string to a date object without validating it against the time options.
   *
   * @param {string} dateStr - The date string to be parsed.
   * @return {Date | undefined} The resulting Date object if the input is valid, otherwise undefined.
   */
  public parseDateString(dateStr: string): Date | undefined {
    if (!this.isValidDateString(dateStr)) return undefined;
    return new Date(dateStr);
  }

  /**
   * Helper method to quickly generate a formated query string from the default time restriction
   * provided by the time options.
   *
   * @return {string | undefined} The formatted defaults as query string or undefined if no defaults are available.
   */
  public getFormattedDefault(): string | undefined {
    if (this.mode === 'range' && this.minDefaultValue && this.maxDefaultValue) {
      return this.formatTimeRange(this.minDefaultValue, this.maxDefaultValue);
    }
    if (this.mode === 'value' && this.minDefaultValue) {
      return this.formatDateString(this.minDefaultValue);
    }
    return undefined;
  }

  private isValidDateString(dateString: string): boolean {
    return !isNaN(Date.parse(dateString));
  }

  private isWithinRange(date: Date): boolean {
    return date >= this.minValue && date <= this.maxValue;
  }

  static formatAsDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Formats a given date into a string, representing the week range from Monday to Sunday that the date falls into.
   */
  static formatAsWeekRange(date: Date): string {
    const dayOfTheWeek = date.getUTCDay();
    const dayOfTheMonth = date.getUTCDate();
    const monday = dayOfTheMonth - dayOfTheWeek + (dayOfTheWeek === 0 ? -6 : 1);
    const sunday = dayOfTheMonth - (dayOfTheWeek === 0 ? 7 : dayOfTheWeek) + 7;
    const startOfWeek = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), monday));
    const endOfWeek = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), sunday));
    return `${LayerTimeFormatter.formatAsDate(startOfWeek)}/${LayerTimeFormatter.formatAsDate(endOfWeek)}`;
  }

  static formatAsMonth(date: Date): string {
    return `${date.toISOString().split('T')[0].slice(0, -3)}`;
  }

  static formatAsYear(date: Date): string {
    return `${date.getUTCFullYear()}`;
  }

  /**
   * Constructs a query string based on a single date value and a specified time resolution.
   *
   * @param {Date} date - The date value to be formatted.
   * @param {TimeResolution} resolution - The time resolution specifying the format (e.g. day, week, month, year).
   * @return {string} A formatted string representation of the date based on the provided resolution.
   */
  static queryStringFromSingleValueAndResolution(date: Date, resolution: TimeResolution): string {
    switch (resolution) {
      case 'day':
        return LayerTimeFormatter.formatAsDate(date);
      case 'week':
        // If in 'value' mode, a week resolution is not supported. Return the date as is.
        return LayerTimeFormatter.formatAsDate(date);
      case 'month':
        return LayerTimeFormatter.formatAsMonth(date);
      case 'year':
        return LayerTimeFormatter.formatAsYear(date);
      default:
        return date.toISOString();
    }
  }

  /**
   * Formats a date range as a string, separated by a forward slash and taking the resolution into account
   * when defining the precision of the date strings.
   *
   * @param {Date} lowerLimit - The starting date of the range.
   * @param {Date} upperLimit - The ending date of the range.
   * @param {TimeResolution} resolution - The resolution of the date range, can be 'day', 'week', 'month', or 'year'.
   * @return {string} A query string representing the date range formatted according to the specified resolution.
   */
  static queryStringFromDateRangeAnResolution(lowerLimit: Date, upperLimit: Date, resolution: TimeResolution): string {
    switch (resolution) {
      case 'day':
        return `${LayerTimeFormatter.formatAsDate(lowerLimit)}/${LayerTimeFormatter.formatAsDate(upperLimit)}`;
      case 'week':
        return `${LayerTimeFormatter.formatAsWeekRange(lowerLimit)}/${LayerTimeFormatter.formatAsWeekRange(upperLimit)}`;
      case 'month':
        return `${LayerTimeFormatter.formatAsMonth(lowerLimit)}/${LayerTimeFormatter.formatAsMonth(upperLimit)}`;
      case 'year':
        return `${LayerTimeFormatter.formatAsYear(lowerLimit)}/${LayerTimeFormatter.formatAsYear(upperLimit)}`;
      default:
        return `${lowerLimit.toISOString()}/${upperLimit.toISOString()}`;
    }
  }
}

export default LayerTimeFormatter;
