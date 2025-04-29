import BaseLayer from './baselayer';
import ILayerWithTime from './ilayerwithtime';
import ITimeOptions from '../../tools/time/itimeoptions';
import LayerTimeFormatter from '../../tools/time/layertimeformatter';

export type GroupLayerOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  isDefaultExpanded?: boolean;
  isExclusiveGroup?: boolean;
  time?: ITimeOptions;
};

class GroupLayer extends BaseLayer implements ILayerWithTime {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public isExclusiveGroup: boolean;
  public isExpanded: boolean;
  public activeState: 'on' | 'off' | 'semi' = 'off';

  public timeOptions?: ITimeOptions;
  public timeRestriction?: string;

  children: BaseLayer[] = [];

  constructor(id: number, name: string, order: number, options?: GroupLayerOptions) {
    super(id, name, order, options);
    this.isExpanded = options?.isDefaultExpanded || false;
    this.isExclusiveGroup = options?.isExclusiveGroup ?? false;
    this.timeOptions = options?.time;

    this.setDefaultTimeRestriction();
  }

  clone(): GroupLayer {
    const options = {
      isDefaultChecked: this.isDefaultChecked,
      metadataUrl: this.metadataUrl,
      disclaimer: this.disclaimer,
      isDefaultExpanded: this.isExpanded,
      isExclusiveGroup: this.isExclusiveGroup,
      time: this.timeOptions
    };
    const clonedObject = new GroupLayer(this.id, this.name, this.order, options);
    clonedObject.activeState = this.activeState;
    clonedObject.timeRestriction = this.timeRestriction;

    // Clone children
    for (const child of this.children) {
      const clonedChild = child.clone();
      clonedChild.parent = clonedObject;
      clonedObject.children.push(clonedChild);
    }

    return clonedObject;
  }

  get active() {
    return this.activeState === 'on';
  }

  get inactive() {
    return this.activeState === 'off';
  }

  get semiActive() {
    return this.activeState === 'semi';
  }

  get hasTimeRestriction() {
    return !!this.timeRestriction;
  }

  setDefaultTimeRestriction() {
    if (this.timeOptions) {
      const timeFormatter = new LayerTimeFormatter(this.timeOptions);
      this.timeRestriction = timeFormatter.getFormattedDefault();
    }
  }
}

export default GroupLayer;
