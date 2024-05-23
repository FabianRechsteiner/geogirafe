import GirafeSingleton from '../../base/GirafeSingleton';
import Map from 'ol/Map';
import { Extent } from 'ol/extent';
import BaseLayer from 'ol/layer/Base';

/** The singleton containing the main OpenLayers map accessible from everywhere */
export default class MapManager extends GirafeSingleton {
  private readonly map = new Map({ layers: [] });

  public getMap() {
    return this.map;
  }

  /**
   * @returns an array of BaseLayer objects that should be printed and that are not in the layer tree.
   */
  public getLayersToPrint(): BaseLayer[] {
    return this.map.getAllLayers().filter((layer) => layer.get('addToPrintedLayers'));
  }

  public zoomToExtent(extent: Extent, minResolution?: number) {
    this.map.getView().fit(extent, {
      minResolution: minResolution
    });
  }
}
