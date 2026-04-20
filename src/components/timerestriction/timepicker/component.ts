// SPDX-License-Identifier: Apache-2.0
import TimeWidget, { TimeRangeLimit } from '../tools/timewidget';

/**
 * A component consisting of two `<input>` elements of type date picker for temporal layer filtering.
 * It supports specifying single-dates or date ranges.
 * The widget validates input dates based on the specified `timeOptions`. In `range` mode, it validates
 * lower and upper range limits so that they do not cross each other.
 */
class TimePickerComponent extends TimeWidget {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];

  public constructor() {
    super('time-picker');
  }

  override renderComponent() {
    super.renderComponent();
    this.configureInputElements();
    this.addEventListeners();
  }

  /**
   * Sets the value of the specified input element.
   *
   * @param {string} dateStr - The date string to be set as the value.
   * @param {TimeRangeLimit} [limit='lower'] - The time range limit for which the value is to be set ('lower' or 'upper').
   */
  public setValue(dateStr: string, limit: TimeRangeLimit = 'lower') {
    if (!this.rendered) throw new Error('Cannot set value on unrendered component');
    if (limit === 'upper' && this.mode === 'value') return;

    this.getInputElement(limit).value = dateStr;

    // Validate and dispatch event
    if (limit === 'lower') {
      this.validateLowerLimit();
    } else {
      this.validateUpperLimit();
    }

    this.dispatchTimeChangeEvent();
  }

  /**
   * Resets the input elements to their default states. This either will be empty strings
   * or the optionally defined `minDefaultValue` and `maxDefaultValue`.
   * The method will trigger a `TimeChangeEvent` that bubbles up to the parent component.
   */
  public reset() {
    this.setValue(this.minDefaultValue, 'lower');
    if (this.mode === 'range') this.setValue(this.maxDefaultValue, 'upper');
  }

  /**
   * Sets the HTML element attributes to the initial values. Must only be called ones.
   */
  private configureInputElements() {
    this.lowerInputElem.type = this.getHtmlInputType();
    this.lowerInputElem.min = this.timeFormatter.formatDateString(this.minValue);
    this.lowerInputElem.max = this.timeFormatter.formatDateString(this.maxValue);
    this.lowerInputElem.value = this.minDefaultValue;

    if (this.mode === 'range') {
      this.upperInputElem.type = this.getHtmlInputType();
      this.upperInputElem.min = this.timeFormatter.formatDateString(this.minValue);
      this.upperInputElem.max = this.timeFormatter.formatDateString(this.maxValue);
      this.upperInputElem.value = this.maxDefaultValue;
    } else {
      this.upperInputElem.classList.add('hidden');
    }
  }

  private getHtmlInputType(): string {
    // Safari and Firefox do not support input type 'month',
    // see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/month
    // But still use 'month' for those browsers to allow month selection via text input
    switch (this.resolution) {
      case 'day':
        return 'date';
      case 'week':
        return 'date';
      case 'month':
        return 'month';
      case 'year':
        return 'month';
      default:
        return 'date';
    }
  }

  /**
   * Attaches event listeners to input elements to validate their values when user interactions occur.
   * Updates the min/max settings of one datepicker whenever the value of the other is changed.
   */
  private addEventListeners(): void {
    // The change event is triggered when the user selects a date from the calendar popup,
    // presses 'clear' in the calendar popup or types a date manually
    this.lowerInputElem.addEventListener('change', (_event: Event) => {
      // While the user is typing, dates will be incomplete and therefore invalid. They are ignored.
      if (this.lowerInputElem.value === '' || this.timeFormatter.formatDateString(this.lowerInputElem.value)) {
        this.validateLowerLimit();
        this.dispatchTimeChangeEvent();
      }
    });
    // The focusout event is triggered when the user clicks outside the datepicker or presses the escape key
    this.lowerInputElem.addEventListener('focusout', (_event: Event) => {
      this.validateLowerLimit();
      this.dispatchTimeChangeEvent();
    });
    // The keypress event is triggered when the user presses the enter key
    this.lowerInputElem.addEventListener('keypress', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        this.validateLowerLimit();
        this.dispatchTimeChangeEvent();
      }
    });

    if (this.mode === 'range') {
      this.upperInputElem.addEventListener('change', (_event: Event) => {
        if (this.upperInputElem.value === '' || this.timeFormatter.formatDateString(this.upperInputElem.value)) {
          this.validateUpperLimit();
          this.dispatchTimeChangeEvent();
        }
      });
      this.upperInputElem.addEventListener('focusout', (_event: Event) => {
        this.validateUpperLimit();
        this.dispatchTimeChangeEvent();
      });
      this.upperInputElem.addEventListener('keypress', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          this.validateUpperLimit();
          this.dispatchTimeChangeEvent();
        }
      });
    }
  }

  private validateLowerLimit() {
    const newValue = this.getValue('lower');
    // Check if the user entered a valid date inside the accepted time range by formatting it
    if (this.timeFormatter.formatDateString(newValue)) {
      if (this.mode === 'range') this.upperInputElem.min = newValue;
    } else {
      // Invalid date entered, reset to default value
      this.lowerInputElem.value = this.minDefaultValue;
    }
  }

  private validateUpperLimit() {
    const newValue = this.getValue('upper');
    // Check if the user entered a valid date inside the accepted time range by formatting it
    if (this.timeFormatter.formatDateString(newValue)) {
      if (this.mode === 'range') this.lowerInputElem.max = newValue;
    } else {
      // Invalid date entered, reset to default value
      this.upperInputElem.value = this.maxDefaultValue;
    }
  }
}

export default TimePickerComponent;
