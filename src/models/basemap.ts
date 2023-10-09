import BaseLayer from "./layers/baselayer";
import LayerVectorTiles from "./layers/layervectortiles";

class Basemap {
  id: number;
  name: string;

  // Layers
  layersList: BaseLayer[] = [];

  constructor(elem: { id: number, name: string }) {
    this.id = elem.id;
    this.name = elem.name;
  }

  get projection(): string | null {
    if (this.layersList[0] instanceof LayerVectorTiles) {
      return this.layersList[0].projection;
    }
    return null;
  }
}

export default Basemap;
