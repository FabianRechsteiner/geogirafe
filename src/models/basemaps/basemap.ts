import { GMFBackgroundLayer } from '../gmf';
import BaseLayer from '../layers/baselayer';
import LayerVectorTiles from '../layers/layervectortiles';

class Basemap {
  id: number;
  name: string;
  thumbnail: string;

  // Layers
  layersList: BaseLayer[] = [];

  constructor(elem: GMFBackgroundLayer) {
    this.id = elem.id;
    this.name = elem.name;
    this.thumbnail = elem.metadata?.thumbnail ?? 'images/basemap_default.png';
  }

  get projection(): string | null {
    if (this.layersList[0] instanceof LayerVectorTiles) {
      if (this.layersList[0].projection) {
        return this.layersList[0].projection;
      }
    }
    return null;
  }
}

export default Basemap;
