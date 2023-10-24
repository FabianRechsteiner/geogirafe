import Layer from './layer';

class LayerWmts extends Layer {
  /**
   * This class is a used in the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside, 
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  public url: string;
  public layers: string;
  public dimensions: Record<string, {}> | null;

  constructor(elem: any, order: number) {
    if (!elem.url) {
      throw new Error("No URL defined for WMTS layer " + elem.name);
    }

    super(elem, order);
    this.url = elem.url;
    this.layers = elem.layer;
    this.dimensions = elem.dimensions;
  }

  get layerUniqueId() {
    if (this.dimensions !== null) {
      return this.layers + JSON.stringify(this.dimensions);
    }
    return this.name;
  }
}

export default LayerWmts;
