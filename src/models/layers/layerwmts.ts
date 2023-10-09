import Layer from './layer';

class LayerWmts extends Layer {

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
