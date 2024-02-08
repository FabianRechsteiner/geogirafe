import { GMFTreeItem } from '../gmf';
import BaseLayer from './baselayer';

class Layer extends BaseLayer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public activeState: 'on' | 'off' = 'off';
  public opacity: number = 1;
  public order: number = 0;

  // Is this layer used as basemap ?
  basemap = false;

  constructor(elem: GMFTreeItem, order: number) {
    const isDefaultChecked = elem.metadata?.isChecked ?? false;
    const disclaimer = elem.metadata?.disclaimer ?? null;
    super(elem.id, elem.name, order, isDefaultChecked, disclaimer);
  }

  get isTransparent() {
    return this.opacity !== 1;
  }

  get active() {
    return this.activeState === 'on';
  }

  get inactive() {
    return this.activeState === 'off';
  }
}

export default Layer;
