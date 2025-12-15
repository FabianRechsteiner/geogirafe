import BaseLayer from './baselayer';
import ILayerWithTime from './ilayerwithtime';
import ITimeOptions from '../../tools/time/itimeoptions';
import LayerTimeFormatter from '../../tools/time/layertimeformatter';
import LayerWms from './layerwms';

export type GroupLayerOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  isDefaultExpanded?: boolean;
  isExclusiveGroup?: boolean;
  isMixed?: boolean;
  time?: ITimeOptions;
  timeAttribute?: string;
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
  public _isMixed?: boolean;
  public activeState: 'on' | 'off' | 'semi' = 'off';

  public timeOptions?: ITimeOptions;
  public timeAttribute?: string;
  public timeRestriction?: string;

  public children: BaseLayer[] = [];

  public constructor(id: number, name: string, order: number, options?: GroupLayerOptions) {
    super(id, name, order, options);
    this.isExpanded = options?.isDefaultExpanded || false;
    this.isExclusiveGroup = options?.isExclusiveGroup ?? false;
    this._isMixed = options?.isMixed;
    this.timeOptions = options?.time;
    this.timeAttribute = options?.timeAttribute;

    this.setDefaultTimeRestriction();
  }

  public clone(): GroupLayer {
    const options = {
      isDefaultChecked: this.isDefaultChecked,
      metadataUrl: this.metadataUrl,
      disclaimer: this.disclaimer,
      isDefaultExpanded: this.isExpanded,
      isExclusiveGroup: this.isExclusiveGroup,
      isMixed: this._isMixed,
      time: this.timeOptions,
      timeAttribute: this.timeAttribute
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

  public get active() {
    return this.activeState === 'on';
  }

  public get inactive() {
    return this.activeState === 'off';
  }

  public get semiActive() {
    return this.activeState === 'semi';
  }

  public get hasTimeRestriction() {
    return !!this.timeRestriction;
  }

  public get hasGrandChildren(): boolean {
    for (const child of this.children) {
      if ((child as GroupLayer).children?.length) {
        return true;
      }
    }
    return false;
  }

  public setDefaultTimeRestriction() {
    if (this.timeOptions) {
      const timeFormatter = new LayerTimeFormatter(this.timeOptions);
      this.timeRestriction = timeFormatter.getFormattedDefault();
    }
  }

  /**
   * Checks if all the children are LayerWms with the same ogcServer, opacity
   * time
   */
  public get isMixed(): boolean {
    // It was explicitly set to true, it can't be unmixed
    if (this._isMixed) {
      return this._isMixed;
    }

    // If any child is not a GroupLayer or LayerWms, return true immediately
    for (const child of this.children) {
      if (!(child instanceof GroupLayer) && !(child instanceof LayerWms)) {
        return true;
      }
    }

    // Collect all LayerWms children and grandchildren recursively
    const layerWmsList: LayerWms[] = [];
    function collectLayerWms(layer: BaseLayer) {
      if (layer instanceof LayerWms) {
        layerWmsList.push(layer);
      } else if (layer instanceof GroupLayer) {
        for (const child of layer.children) {
          collectLayerWms(child);
        }
      }
    }
    for (const child of this.children) {
      collectLayerWms(child);
    }

    // Check if all LayerWms have the same properties
    if (layerWmsList.length > 0) {
      const first = layerWmsList[0];
      const allSame = layerWmsList.every(
        (lw) =>
          lw.opacity === first.opacity &&
          lw.ogcServer === first.ogcServer &&
          lw.filter === first.filter &&
          lw.timeRestriction === first.timeRestriction
      );
      if (allSame) {
        return false;
      }
    }
    return true;
  }
}

export default GroupLayer;
