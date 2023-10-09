import Layer from "./layer";

class LayerVectorTiles extends Layer {

  public style: string;
  public source: string;
  public projection: string | null;

  constructor(elem: any, order: number) {
    super(elem, order);

    this.style = elem.style;
    this.projection = elem.projection;
    this.source = elem.source;
  }
}

export default LayerVectorTiles;