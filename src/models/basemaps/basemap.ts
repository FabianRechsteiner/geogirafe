// SPDX-License-Identifier: Apache-2.0
import { GMFBackgroundLayer } from '../gmf';
import BaseLayer from '../layers/baselayer';
import LayerVectorTiles from '../layers/layervectortiles';

class Basemap {
  public id: number;
  public name: string;
  public thumbnail: string;
  public opacity: number;

  // Layers
  public layersList: BaseLayer[] = [];

  public constructor(elem: GMFBackgroundLayer, opacity?: number) {
    this.id = elem.id;
    this.name = elem.name;
    this.thumbnail = elem.metadata?.thumbnail ?? 'images/basemap_default.webp';
    this.opacity = opacity ?? -1;
  }

  public get projection(): string | undefined {
    const layer = this.layersList.find((l) => l instanceof LayerVectorTiles);
    return layer?.projection;
  }

  public get opacityDisabled() {
    return this.opacity === -1;
  }
}

export default Basemap;
