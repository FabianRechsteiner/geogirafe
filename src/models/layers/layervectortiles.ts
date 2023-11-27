import { GMFTreeItem } from '../gmf';
import Layer from './layer';

class LayerVectorTiles extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public style?: string;
  public source?: string;
  public projection?: string | null;

  constructor(elem: GMFTreeItem, order: number) {
    super(elem, order);

    this.style = elem.style;
    this.projection = elem.projection;
    this.source = elem.source;
  }
}

export default LayerVectorTiles;
