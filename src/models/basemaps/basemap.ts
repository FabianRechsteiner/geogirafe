import ConfigManager from '../../tools/configuration/configmanager';
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

  get projection(): string {
    if (this.layersList[0] instanceof LayerVectorTiles) {
      // Vector-tiles are only available in specific projection
      if (this.layersList[0].projection) {
        return this.layersList[0].projection;
      }
    }

    // For all other cases, we set the default map projection
    return ConfigManager.getInstance().Config.map.srid;
  }
}

export default Basemap;
