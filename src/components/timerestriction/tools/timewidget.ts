import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import LayerTimeFormatter from '../../../tools/time/layertimeformatter';
import ITimeOptions, { TimeMode, TimeResolution } from '../../../tools/time/itimeoptions';
import { debounce } from '../../../tools/utils/debounce';

export type TimeRangeLimit = 'lower' | 'upper';
export const TimeChangeEvent = 'timeChange';

/**
 * The `TimeWidget` class is a custom HTML element used to manage and display a time range or time value
 * through one or two sliders or date pickers. It supports two modes (`range` or `value`) and returns
 * date strings formatted according to the specified time resolution and mode.
 * The initialize method needs to be called first to configure the widget with an object of type ITimeOptions.
 *
 * This class must be extended, since it doesn't have a template of its own.
 */
class TimeWidget extends GirafeHTMLElement {
  protected lowerInputElem!: HTMLInputElement;
  protected upperInputElem!: HTMLInputElement;

  protected timeFormatter!: LayerTimeFormatter;
  protected resolution!: TimeResolution;
  public mode!: TimeMode;

  protected minValue!: Date;
  protected maxValue!: Date;

  protected minDefaultValue: string = '';
  protected maxDefaultValue: string = '';

  private readonly debounceTime = 500;
  private timeChangeEventDebounced: ((unset: boolean) => void) | undefined = undefined;

  public constructor(name: string) {
    super(name);
  }

  /**
   * Initializes the widget and sets properties of the input elements. Must be called before using the widget.
   *
   * @param {ITimeOptions} timeOptions - Configuration options for the time widget.
   */
  public initialize(timeOptions: ITimeOptions) {
    this.timeFormatter = new LayerTimeFormatter(timeOptions);
    this.resolution = this.timeFormatter.resolution;
    this.mode = this.timeFormatter.mode;

    this.minValue = this.timeFormatter.minValue;
    this.maxValue = this.timeFormatter.maxValue;

    // Optional, initial time restriction. These values already have been applied to the layer when it was initialized.
    this.minDefaultValue = this.timeFormatter.formatDateString(timeOptions.minDefValue ?? '');
    this.maxDefaultValue = this.timeFormatter.formatDateString(timeOptions.maxDefValue ?? '');
  }

  public render() {
    if (!this.mode) {
      // If not initialized, the component can't be displayed
      this.renderEmpty();
    } else if (!this.rendered) {
      this.renderComponent();
    } else {
      super.render();
      super.girafeTranslate();
    }
  }

  public renderComponent() {
    super.render();
    this.lowerInputElem = this.getById('input-lower');
    this.upperInputElem = this.getById('input-upper');
  }

  protected getInputElement(limit?: TimeRangeLimit): HTMLInputElement {
    if (limit === 'upper' && this.mode === 'range') {
      return this.upperInputElem;
    } else {
      return this.lowerInputElem;
    }
  }

  /**
   * Retrieves the value associated with the input element of the specified limit.
   *
   * @param {TimeRangeLimit} [limit] - Optional parameter specifying the input Element ('upper' or 'lower')
   * for which value is to be fetched.
   * @return {string} The raw value retrieved from the input element.
   */
  public getValue(limit?: TimeRangeLimit): string {
    if (limit === 'upper' && this.mode === 'value') return '';
    return this.getInputElement(limit).value;
  }

  /**
   * Get the current time restriction as a formatted query string.
   *
   * @return {string | undefined} The formatted time restriction as string or undefined if the time restriction is empty.
   *
   */
  public getTimeRestriction(): string | undefined {
    let newTime = '';
    const lower = this.getValue('lower');
    const upper = this.getValue('upper');
    if (this.mode === 'value') {
      newTime = this.timeFormatter.formatDateString(lower);
    } else {
      newTime = this.timeFormatter.formatTimeRange(lower, upper);
    }
    return newTime === '' ? undefined : newTime;
  }

  /**
   * Dispatches a custom event to notify the parent about the changed time.
   *
   * @param {boolean} unset - Set the time restriction to undefined.
   */
  private createTimeChangeEvent(unset: boolean = false) {
    this.dispatchEvent(
      new CustomEvent(TimeChangeEvent, {
        bubbles: true,
        cancelable: true,
        detail: unset ? undefined : this.getTimeRestriction()
      })
    );
  }

  /**
   * Dispatches a debounced time change event to prevent frequent server calls.
   *
   * @param {boolean} [unset=false] - Indicates whether the time will be set to undefined.
   */
  protected dispatchTimeChangeEvent(unset: boolean = false) {
    // Debounce the time change event to limit server calls
    this.timeChangeEventDebounced ??= debounce(this.createTimeChangeEvent, this.debounceTime);
    this.timeChangeEventDebounced(unset);
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
    super.girafeTranslate();
  }
}

export default TimeWidget;
