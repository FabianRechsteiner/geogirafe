import GirafeSingleton from '../../base/GirafeSingleton';
import MapOL from 'ol/Map';
import type { Extent } from 'ol/extent';
import type BaseLayer from 'ol/layer/Base';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import StateManager from './statemanager';

/** The singleton containing the main OpenLayers map accessible from everywhere */
export default class MapManager extends GirafeSingleton {
  private readonly map = new MapOL({
    controls: defaultControls({ rotate: false, zoom: StateManager.getInstance().state.interface.isMobile }),
    layers: []
  });
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
