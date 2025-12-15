import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { TimeAwareLayer } from '../../models/layers/timeawarelayer';
import TimePickerComponent from './timepicker/component';
import TimeSliderComponent from './timeslider/component';
import LayerTimeFormatter, { TIME_RANGE_SEPARATOR } from '../../tools/time/layertimeformatter';
import ITimeOptions, { TimeMode, TimeWidget } from '../../tools/time/itimeoptions';
import { TimeChangeEvent } from './tools/timewidget';

class TimeRestrictionComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  public layer: TimeAwareLayer;
  public timeOptions: ITimeOptions;
  public timeFormatter: LayerTimeFormatter;

  public mode: TimeMode;
  public widget: TimeWidget;

  public timeWidget!: TimeSliderComponent | TimePickerComponent;

  public constructor(layer: TimeAwareLayer) {
    super(`time-${layer.id}`);
    this.layer = layer;
    this.timeOptions = this.layer.timeOptions!;

    this.mode = this.timeOptions.mode;
    this.widget = this.timeOptions.widget;

    this.timeFormatter = new LayerTimeFormatter(this.timeOptions);
  }

  public renderComponent() {
    this.render();
    super.girafeTranslate();

    this.initTimeWidget();

    // Wait for the time widget to be rendered, then set the time
    setTimeout(() => {
      this.onOutsideTimeChange(this.layer.timeRestriction);
    });
  }

  public initTimeWidget() {
    if (!this.timeWidget) {
      // The type of time widget component in the template is dependent on the timeOptions > widget value
      this.timeWidget = this.getById('time-widget');
      this.timeWidget.initialize(this.timeOptions);
      this.timeWidget.render();

      // Connect change event of widget
      this.timeWidget.addEventListener(TimeChangeEvent, ((evt: CustomEvent) =>
        this.onTimeChange(evt.detail)) as EventListener);
    }
  }

  public onTimeChange(newTimeRestriction: string | undefined) {
    newTimeRestriction = newTimeRestriction === null ? undefined : newTimeRestriction;
    if (newTimeRestriction !== this.layer.timeRestriction) {
      this.layer.timeRestriction = newTimeRestriction;
    }
  }

  public onRemove() {
    this.timeWidget.reset();
  }

  public onOutsideTimeChange(newTime: string | undefined) {
    if (!newTime) {
      this.timeWidget.reset();
    } else {
      const [lowerValue, upperValue] = newTime.split(TIME_RANGE_SEPARATOR);
      this.timeWidget.setValue(lowerValue, 'lower');
      if (this.mode === 'range') this.timeWidget.setValue(upperValue, 'upper');
    }
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.renderComponent();
  }
}

export default TimeRestrictionComponent;
