// SPDX-License-Identifier: Apache-2.0
import Layer from './layer';

type LayerVectorTilesOptions = {
  projection?: string;
  layerName?: string;
  isDefaultChecked?: boolean;
  disclaimer?: string;
  metadataUrl?: string;
  opacity?: number;
  protected?: boolean;
};

class LayerVectorTiles extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public style: string;
  public layerName?: string;
  public projection?: string;

  public constructor(id: number, name: string, order: number, style: string, options?: LayerVectorTilesOptions) {
    super(id, name, order, options);
    this.style = style;
    this.layerName = options?.layerName;
    this.projection = options?.projection;
  }

  public clone() {
    const options = {
      projection: this.projection,
      layerName: this.layerName,
      isDefaultChecked: this.isDefaultChecked,
      metadataUrl: this.metadataUrl,
      disclaimer: this.disclaimer,
      opacity: this.opacity,
      restricted: this.restricted
    };
    const clonedObject = new LayerVectorTiles(this.id, this.name, this.order, this.style, options);
    clonedObject.activeState = this.activeState;
    return clonedObject;
  }
}

export default LayerVectorTiles;
