import LayerTimeFormatter from '../../../tools/time/layertimeformatter';
import ITimeOptions from '../../../tools/time/itimeoptions';
import TimeWidget, { TimeRangeLimit } from '../tools/timewidget';


/**
 * A widget that represents a time slider with configurable time resolution. The slider supports
 * a single value or a time range depending on the specified mode.
 *
 * It consists of two `<input>` elements of type `range` that are configured by receiving `timeOptions`
 * in its initialize method. It validates input changes to ensure compliance
 * with the defined `timeOptions` and dynamically updates output elements to display nicely formatted time values.
 */
class TimeSliderComponent extends TimeWidget {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];

  private discreteTimeSteps?: string[];

  constructor() {
    super('time-slider');
  }

  /**
   * Initializes the widget and sets properties of the input elements. Must be called before using the widget.
   *
   * @param {ITimeOptions} timeOptions - Configuration options for the time widget.
   */
  public initialize(timeOptions: ITimeOptions) {
    super.initialize(timeOptions);

    // timeOptions can optionally define a list of discrete time values for the slider to step through
    this.discreteTimeSteps =
      timeOptions.values?.map((d) => this.timeFormatter.formatDateString(d)).filter((dstr) => dstr && dstr !== '') ??
      undefined;
    if (this.discreteTimeSteps) {
      // Validate min/max values by checking if they correspond to the first and last value in the discreteTimeSteps list
      this.minValue = this.timeFormatter.parseDateString(this.discreteTimeSteps[0])!;
      this.maxValue = this.timeFormatter.parseDateString(this.discreteTimeSteps[this.discreteTimeSteps.length - 1])!;
    }
  }

  public renderComponent() {
    super.renderComponent();
    this.configureInputElements();
    // Set default values for slider handles
    this.reset();
    this.addEventListeners();
  }

  /**
   * Retrieves the value associated with the input element of the specified limit.
   *
   * @param {TimeRangeLimit} [limit] - Optional parameter specifying the limit ('upper' or 'lower') for which value is to be fetched.
   * @return {string} The date string value retrieved from the input element.
   */
  public getValue(limit?: TimeRangeLimit): string {
    return this.sliderPositionToDateString(super.getValue(limit));
  }

  /**
   * Transforms the date string to a slider position and set it to the specified input element.
   * Optionally, the `timeChange` event can be omitted.
   * Updates the UI elements (output, slider track) to the new value
   * and validates the positions of the sliders so the handles do not cross each other `range` mode.
   *
   * @param {string} dateStr - The date string to be set as the value.
   * @param {TimeRangeLimit} [limit='lower'] - The time range limit for which the value is to be set ('lower' or 'upper').
   * @param {boolean} [triggerEvent=true] - Weather the `timeChange` event should be dispatched.
   */
  public setValue(dateStr: string, limit: TimeRangeLimit = 'lower', triggerEvent: boolean = true) {
    if (!this.rendered) throw new Error('Cannot set value on unrendered component');
    if (limit === 'upper' && this.mode === 'value') return;

    this.getInputElement(limit).value = this.dateStringToSliderPosition(dateStr);

    // Update UI elements, trigger validation and dispatch event
    this.updateOutputLabel(limit);
    this.updateSliderColorRange();
    this.toggleSliderState(dateStr !== '');
    limit === 'lower' ? this.validateLowerLimit() : this.validateUpperLimit();
    if (triggerEvent) this.dispatchTimeChangeEvent();
  }

  /**
   * Resets the input elements to their default states. This will be the min and max slider position
   * or the optionally defined `minDefaultValue` and `maxDefaultValue`.
   * Without `minDefaultValue` and `maxDefaultValue`, the slider state is set to disable.
   * The method will trigger a `TimeChangeEvent` that bubbles up to the parent component.
   */
  public reset() {
    if (this.minDefaultValue || this.maxDefaultValue) {
      // Apply default values
      this.setValue(this.minDefaultValue, 'lower');
      if (this.mode === 'range') this.setValue(this.maxDefaultValue, 'upper');
    } else {
      // Without any default values, set the lower handle to the min and the upper handle to the max position
      this.setValue(this.minDefaultValue, 'lower', false);
      if (this.mode === 'range') this.setValue(this.timeFormatter.formatDateString(this.maxValue), 'upper', false);
      this.toggleSliderState(false);
      this.dispatchTimeChangeEvent(true);
    }
  }

  private configureInputElements() {
    this.lowerInputElem.max = this.countSliderStepsInRange().toString();
    this.lowerInputElem.value = this.dateStringToSliderPosition(this.minDefaultValue);
    if (this.mode === 'range') {
      this.upperInputElem.max = this.countSliderStepsInRange().toString();
      this.upperInputElem.value = this.maxDefaultValue
        ? this.dateStringToSliderPosition(this.maxDefaultValue)
        : this.countSliderStepsInRange().toString();
    }
    // Hide the second slider in 'value' mode
    if (this.mode === 'value') {
      this.upperInputElem.classList.add('hidden');
    }
  }

  private addEventListeners() {
    // Update UI elements when the slider handle is moved
    this.lowerInputElem.addEventListener('input', (_event: Event) => {
      this.updateOutputLabel('lower');
      this.updateSliderColorRange();
      this.toggleSliderState(true);
    });

    // Validate and dispatch event when the slider handle stops at the new position
    this.lowerInputElem.addEventListener('change', (_event: Event) => {
      this.validateLowerLimit();
      this.dispatchTimeChangeEvent();
    });

    if (this.mode === 'range') {
      // Update UI elements when the slider handle is moved
      this.upperInputElem.addEventListener('input', (_event: Event) => {
        this.updateOutputLabel('upper');
        this.updateSliderColorRange();
        this.toggleSliderState(true);
      });

      // Validate and dispatch event when the slider handle stops at the new position
      this.upperInputElem.addEventListener('change', (_event: Event) => {
        this.validateUpperLimit();
        this.dispatchTimeChangeEvent();
      });
    }

    // Register clicks on the slider track and translate them to handle positions
    this.getById('slider-track').addEventListener('click', (event: MouseEvent) => {
      this.trackClickToSliderPosition(event);
    });

    // Make time labels editable if resolution is year
    if (this.resolution === 'year') {
      const lowerLabel = this.getById(`output-label-lower`);
      const upperLabel = this.getById(`output-label-upper`);
      [lowerLabel, upperLabel].forEach((label) => {
        label.removeAttribute('disabled');
        label.setAttribute('type', 'number');
      });
      const yearEntryToSliderVal = (event: Event) => {
        let year = (event.target as HTMLInputElement)?.value;
        year = year.padStart(4, '0');
        return this.dateStringToSliderPosition(`${year}-01-01`);
      };
      // Update the slider position and track when the label is changed
      lowerLabel.addEventListener('change', (event: Event) => {
        this.lowerInputElem.value = yearEntryToSliderVal(event);
        this.lowerInputElem.dispatchEvent(new Event('input'));
      });
      // Trigger a time restriction change when the enter key is pressed
      lowerLabel.addEventListener('keypress', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          this.lowerInputElem.dispatchEvent(new Event('change'));
        }
      });
      // Trigger a time restriction change when the input looses focus
      lowerLabel.addEventListener('focusout', (_event: Event) =>
        this.lowerInputElem.dispatchEvent(new Event('change'))
      );
      if (this.mode === 'range') {
        // Same event listeners for the upper input element
        upperLabel.addEventListener('change', (event: Event) => {
          this.upperInputElem.value = yearEntryToSliderVal(event);
          this.upperInputElem.dispatchEvent(new Event('input'));
        });
        upperLabel.addEventListener('keypress', (event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            this.upperInputElem.dispatchEvent(new Event('change'));
          }
        });
        upperLabel.addEventListener('focusout', (_event: Event) =>
          this.upperInputElem.dispatchEvent(new Event('change'))
        );
      }
    }
  }

  private updateOutputLabel(limit: TimeRangeLimit) {
    const inputElem = this.getInputElement(limit);
    const valueOutput = this.getById(`output-label-${limit}`);
    const newValue = inputElem.value ?? '';
    (valueOutput as HTMLInputElement).value = this.timeFormatter.formatDateString(
      this.sliderPositionToDateString(newValue)
    );
  }

  /**
   * In `range` mode, the slider track gets a linear gradient to indicate the inside and outside of the time range.
   */
  private updateSliderColorRange() {
    const maxPosition = this.countSliderStepsInRange();
    if (this.mode !== 'range' || maxPosition === 0) return;

    const lowVal = (100 * parseInt(this.lowerInputElem.value)) / maxPosition;
    const highVal = (100 * (this.mode === 'range' ? parseInt(this.upperInputElem.value) : maxPosition)) / maxPosition;
    const sliderTrackElem = this.getById('slider-track');
    const outCol = 'var(--slider-track-outside-color)';
    const inCol = 'var(--slider-track-inside-color)';
    sliderTrackElem.style.background = `linear-gradient(to right, ${outCol} 0%, ${outCol} ${lowVal}%, ${inCol} ${lowVal}%, ${inCol} ${highVal}%, ${outCol} ${highVal}%, ${outCol} 100%)`;
  }

  /**
   * Indicate an inactive slider by coloring the output labels and slider track in a lighter color.
   */
  private toggleSliderState(active: boolean) {
    this.getById('output-label-lower').style.color = active ? 'var(--slider-color)' : 'var(--slider-disabled-color)';
    this.getById('output-label-upper').style.color = active ? 'var(--slider-color)' : 'var(--slider-disabled-color)';
    this.getById('slider-track').style.borderColor = active
      ? 'var(--slider-track-border-color)'
      : 'var(--slider-disabled-color)';
  }

  /**
   * Registers the position where the user clicks on the slider track
   * and moves the lower or upper slider handle to that position.
   *
   * @param {MouseEvent} event - The mouse event triggered by the click on the slider track.
   */
  private trackClickToSliderPosition(event: MouseEvent) {
    const offsetX = event.offsetX;
    const trackWidth = (event.target as HTMLDivElement).offsetWidth;

    const sliderPosition = Math.round((offsetX / trackWidth) * this.countSliderStepsInRange());
    const dateStr = this.sliderPositionToDateString(sliderPosition.toString());
    if (this.mode === 'value') {
      this.setValue(dateStr, 'lower');
    } else {
      // Decide which slider handle to move
      const currentLowerPosition = Number(this.lowerInputElem.value);
      const currentUpperPosition = Number(this.upperInputElem.value);
      const middlePosition = (currentLowerPosition + currentUpperPosition) / 2;
      let elementToMove: TimeRangeLimit;
      if (sliderPosition <= currentLowerPosition) {
        elementToMove = 'lower';
      } else if (sliderPosition >= currentUpperPosition) {
        elementToMove = 'upper';
      } else {
        elementToMove = sliderPosition < middlePosition ? 'lower' : 'upper';
      }
      this.setValue(dateStr, elementToMove);
    }
  }

  /**
   * Attaches event listeners to input elements to validate their values when user interactions occur.
   * Makes sure the slider positions never cross each other in 'range' mode. Also takes care that
   * slider mouse handlers can be grabbed at any position on the slider by changing the zIndex.
   */
  private validateLowerLimit(): void {
    const newValue = this.sliderPositionToDateString(this.lowerInputElem.value);
    const positionOfUpper = this.sliderPositionToDateString(this.upperInputElem.value);
    if (this.mode === 'range' && newValue > positionOfUpper) {
      this.setValue(positionOfUpper, 'lower');
    }
  }

  private validateUpperLimit() {
    const newValue = this.sliderPositionToDateString(this.upperInputElem.value);
    const positionOfLower = this.sliderPositionToDateString(this.lowerInputElem.value);
    if (this.mode === 'range' && newValue < positionOfLower) {
      this.setValue(positionOfLower, 'upper');
    }
    // Increase z-index of the upper handle if it is at the 0 position,
    // otherwise it is behind the other slider and can't be grabbed any more
    if (Number(this.upperInputElem.value) <= 0) {
      this.upperInputElem.style.zIndex = '3';
    } else {
      this.upperInputElem.style.zIndex = '1';
    }
  }

  /**
   * Converts a date string to a corresponding time increment value based on the defined range (minValue/maxValue)
   * and resolution.
   *
   * @param {string} dateStr - The date string to be parsed and evaluated.
   * @return {number} The calculated position on the slider.
   * Returns 0 if the date string is invalid or falls outside the minimum range.
   * Returns the maximum time increment if the date exceeds the defined range.
   */
  private dateStringToSliderPosition(dateStr: string): string {
    let position = 0;

    // Only proceed if the string contains a valid date
    if (this.timeFormatter.parseDateString(dateStr)) {
      const date = new Date(dateStr);
      if (date > this.maxValue) {
        // Return slider max position
        position = this.countSliderStepsInRange();
      } else if (date > this.minValue) {
        position = this.countSliderStepsInRange(date);
      }
    }
    return position.toString();
  }

  /**
   * Converts a given slider position to a formatted date string based on the minValue / maxValue range
   * and resolution (day, week, month, or year). To stay independent of local time, new dates are created in UTC.
   *
   * @param {number} position - The number of increments to add to the current date based on the specified resolution.
   * @return {string} The formatted date string corresponding to the increment value and resolution.
   * @throws {Error} If the resolution is invalid.
   */
  private sliderPositionToDateString(position: string): string {
    if (position === '' || isNaN(Number(position))) return '';

    const increment = Number(position);
    const oneDayInMillis = 1000 * 60 * 60 * 24;
    let newDate: Date;

    if (this.discreteTimeSteps) {
      if (this.discreteTimeSteps.length === 0 || increment >= this.discreteTimeSteps.length) {
        return '';
      }
      return this.discreteTimeSteps[increment];
    }

    switch (this.resolution) {
      case 'day':
        newDate = new Date(
          Date.UTC(this.minValue.getUTCFullYear(), this.minValue.getUTCMonth(), this.minValue.getUTCDate() + increment)
        );
        break;
      case 'week':
        newDate = new Date(this.minValue.getTime() + oneDayInMillis * 7 * increment);
        break;
      case 'month':
        newDate = new Date(
          Date.UTC(this.minValue.getUTCFullYear(), this.minValue.getUTCMonth() + increment, this.minValue.getUTCDate())
        );
        break;
      case 'year':
        newDate = new Date(
          Date.UTC(this.minValue.getUTCFullYear() + increment, this.minValue.getUTCMonth(), this.minValue.getUTCDate())
        );
        break;
      default:
        throw new Error('Invalid resolution');
    }
    return LayerTimeFormatter.queryStringFromSingleValueAndResolution(newDate, this.resolution);
  }

  /**
   * Calculates the number of steps within the given time range based on the specified time resolution.
   * The returned number is zero base, indicating the index of the slider position.
   * The range starts at the minValue of the provided timeOptions.
   *
   * @param {Date} [maxVal] - The upper limit for the range. Defaults to the timeOptions > maxValue if not provided.
   * @return {number} The number of slider steps based on the resolution and time range.
   */
  public countSliderStepsInRange(maxVal?: Date): number {
    maxVal ??= this.maxValue;

    if (this.discreteTimeSteps) {
      const listIdx = this.getPositionInTimeValuesList(maxVal);
      return listIdx ?? 0;
    }

    const timeRangeInMillis = maxVal.getTime() - this.minValue.getTime();
    const oneDayInMillis = 1000 * 60 * 60 * 24;
    const numberOfYears = maxVal.getUTCFullYear() - this.minValue.getUTCFullYear();

    // Return number of steps based on the resolution
    switch (this.resolution) {
      case 'day':
        return Math.round(timeRangeInMillis / oneDayInMillis);
      case 'week':
        return Math.round(timeRangeInMillis / (oneDayInMillis * 7));
      case 'month':
        return numberOfYears * 12 - this.minValue.getUTCMonth() + maxVal.getUTCMonth();
      case 'year':
        return numberOfYears;
      default:
        return 0;
    }
  }

  /**
   * Retrieves the position of a given date within a list of discrete time steps.
   * If the discrete time steps are not defined, the method returns undefined.
   *
   * @param {Date} date - The date for which the position needs to be determined.
   * @return {number | undefined} The index of the date in the list of discrete time steps, or undefined if not found.
   */
  private getPositionInTimeValuesList(date: Date): number | undefined {
    if (!this.discreteTimeSteps) {
      // No discrete time values defined
      return undefined;
    }
    const formattedDate = this.timeFormatter.formatDateString(date);
    return this.discreteTimeSteps.findIndex((value) => value === formattedDate);
  }
}

export default TimeSliderComponent;
