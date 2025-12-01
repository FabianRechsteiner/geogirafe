import BaseLayer from './baselayer';
import GroupLayer from './grouplayer';
import ThemeLayer from './themelayer';

type LayerOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  opacity?: number;
  restricted?: boolean;
};

abstract class Layer extends BaseLayer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public activeState: 'on' | 'off' = 'off';
  public opacity: number;
  public restricted: boolean;
  public swiped: 'left' | 'right' | 'no' = 'no';
  public isLegendExpanded: boolean = false;

  declare parent: ThemeLayer | GroupLayer;

  constructor(id: number, name: string, order: number, options?: LayerOptions) {
    super(id, name, order, options);
    this.opacity = options?.opacity ?? 1;
    this.restricted = options?.restricted ?? false;
  }

  get isTransparent() {
    return this.opacity !== 1;
  }

  get hasValidOpacity() {
    return this.opacity >= 0 && this.opacity <= 1;
  }

  get active() {
    return this.activeState === 'on';
  }

  get inactive() {
    return this.activeState === 'off';
  }
}

export default Layer;
