import { GMFTreeItem } from '../gmf';
import Layer from './layer';

type LayerXYZTilesOptions = {
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  opacity?: number;
  restricted?: boolean;
};

class LayerXYZ extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public source: string;

  public constructor(
    id: number,
    name: string,
    order: number,
    source: string,
    options?: GMFTreeItem | LayerXYZTilesOptions
  ) {
    let opts = options ?? {};
    opts = LayerXYZ.isGMFTreeItem(opts) ? LayerXYZ.getOptionsFromGMFTreeItem(opts) : opts;
    super(id, name, order, opts);
    this.source = source;
  }

  public clone() {
    const options = {
      isDefaultChecked: this.isDefaultChecked,
      metadataUrl: this.metadataUrl,
      disclaimer: this.disclaimer,
      opacity: this.opacity,
      restricted: this.restricted
    };
    const clonedObject = new LayerXYZ(this.id, this.name, this.order, this.source, options);
    clonedObject.activeState = this.activeState;
    return clonedObject;
  }

  private static isGMFTreeItem(options: GMFTreeItem | LayerXYZTilesOptions): options is GMFTreeItem {
    return 'id' in options;
  }

  private static getOptionsFromGMFTreeItem(options: GMFTreeItem): LayerXYZTilesOptions {
    return {
      isDefaultChecked: options.metadata?.isChecked,
      metadataUrl: options.metadata?.metadataUrl,
      disclaimer: options.metadata?.disclaimer,
      opacity: options.metadata?.opacity,
      restricted: options.public === undefined ? (options.metadata?.protected ?? false) : !options.public
    };
  }
}

export default LayerXYZ;
