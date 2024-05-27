import Layer from './layer';

type LayerVectorTilesOptions = {
  projection?: string,
  isDefaultChecked?: boolean, 
  disclaimer?: string,
  opacity?: number
}

class LayerVectorTiles extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public style: string;
  public source: string;
  public projection?: string;

  constructor(id: number, name: string, order: number, style: string, source: string, options?: LayerVectorTilesOptions) {
    super(id, name, order, options);
    this.style = style;
    this.source = source;
    this.projection = options?.projection;
  }

  clone() {
    const options = {
      projection: this.projection,
      isDefaultChecked: this.isDefaultChecked, 
      disclaimer: this.disclaimer,
      opacity: this.opacity
    }
    const clonedObject = new LayerVectorTiles(this.id, this.name, this.order, this.style, this.source, options);
    clonedObject.activeState = this.activeState;
    return clonedObject;
  }
}

export default LayerVectorTiles;
