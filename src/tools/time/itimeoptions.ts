export type TimeResolution = 'day' | 'week' | 'month' | 'year';
export type TimeMode = 'value' | 'range';
export type TimeWidget = 'datepicker' | 'slider';

/**
 * Specifies how options for time restricted layers are structured
 */
interface ITimeOptions {
  // Lower and upper limit of possible time restriction
  minValue: string;
  maxValue: string;
  // Default (initial) settings for time range
  minDefValue: string | null;
  maxDefValue: string | null;
  values?: string[];
  interval: [number, number, number, number];
  resolution: TimeResolution;
  mode: TimeMode;
  widget: TimeWidget;
}

export default ITimeOptions;
