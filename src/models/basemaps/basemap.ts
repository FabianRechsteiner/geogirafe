import { GMFBackgroundLayer } from '../gmf';
import BaseLayer from '../layers/baselayer';
import LayerVectorTiles from '../layers/layervectortiles';

class Basemap {
  id: number;
  name: string;
  thumbnail: string;
  opacity: number;

  // Layers
  layersList: BaseLayer[] = [];

  constructor(elem: GMFBackgroundLayer, opacity?: number) {
    this.id = elem.id;
    this.name = elem.name;
    this.thumbnail = elem.metadata?.thumbnail ?? 'images/basemap_default.webp';
    this.opacity = opacity ?? -1;
  }

  get projection(): string | undefined {
    const layer = this.layersList.find((l) => l instanceof LayerVectorTiles);
    return layer?.projection;
  }
}

export default Basemap;
