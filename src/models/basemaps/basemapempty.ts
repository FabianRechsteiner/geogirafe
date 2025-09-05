import Basemap from './basemap';

export default class BasemapEmpty extends Basemap {
  constructor() {
    const basemapMetadata = {
      isLegendExpanded: false,
      wasLegendExpanded: false,
      exclusiveGroup: false,
      isExpanded: false,
      isChecked: false,
      thumbnail: 'images/basemap_empty.png'
    };

    super({ id: 0, name: 'Empty', metadata: { ...basemapMetadata } });
  }
}
