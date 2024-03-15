import GirafeSingleton from '../../base/GirafeSingleton';
import Map from 'ol/Map';
import BaseLayer from 'ol/layer/Base';

export const createNewMap = (): Map => {
  return new Map({
    layers: []
  });
};

/** The singleton containing the main OpenLayers map accessible from everywhere */
export default class MapManager extends GirafeSingleton {
  private readonly map = createNewMap();

  getMap() {
    return this.map;
  }

  /**
   * @returns an array of BaseLayer objects that should be printed and that are not in the layer tree.
   */
  getLayersToPrint(): BaseLayer[] {
    return this.map.getAllLayers().filter((layer) => layer.get('addToPrintedLayers'));
  }
}
