import GirafeSingleton from '../../base/GirafeSingleton.ts';
import Map from 'ol/Map';

/** The singleton containing the main OpenLayers map accessible from everywhere */
export default class MapManager extends GirafeSingleton {
  private readonly map = new Map({
    layers: []
  });

  getMap() {
    return this.map;
  }
}
