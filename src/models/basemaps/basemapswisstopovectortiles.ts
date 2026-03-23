// SPDX-License-Identifier: Apache-2.0
import LayerConsts from '../layers/layerconsts';
import LayerVectorTiles from '../layers/layervectortiles';
import Basemap from './basemap';

export default class BasemapSwisstopoVectorTiles extends Basemap {
  public constructor() {
    const basemapMetadata = {
      isLegendExpanded: false,
      wasLegendExpanded: false,
      exclusiveGroup: false,
      isExpanded: false,
      isChecked: false,
      thumbnail: 'images/basemap_vectortiles.webp'
    };

    super({
      id: LayerConsts.LayerSwisstopoVectorTilesId,
      name: 'Swisstopo Vector-Tiles',
      metadata: { ...basemapMetadata }
    });

    const vectorTilesLayer = new LayerVectorTiles(
      LayerConsts.LayerSwisstopoVectorTilesId,
      'Swisstopo Vector-Tiles',
      0,
      'https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json',
      { projection: 'EPSG:3857' }
    );
    this.layersList.push(vectorTilesLayer);
  }
}
