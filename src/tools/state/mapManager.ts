// SPDX-License-Identifier: Apache-2.0
import GirafeSingleton from '../../base/GirafeSingleton';
import OlMap from 'ol/Map';
import type { Extent } from 'ol/extent';
import type BaseLayer from 'ol/layer/Base';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import { DragPan } from 'ol/interaction';
import { Kinetic } from 'ol';

/** The singleton containing the main OpenLayers map accessible from everywhere */
export default class MapManager extends GirafeSingleton {
  private map?: OlMap;
  private createMap() {
    const interactions = defaultInteractions({ dragPan: false });
    interactions.push(
      new DragPan({
        condition: function (mapBrowserEvent) {
          const event = mapBrowserEvent.originalEvent as PointerEvent;
          return event.isPrimary && event.button < 2 && !event.shiftKey;
        },
        kinetic: new Kinetic(-0.005, 0.05, 100)
      })
    );
    this.map = new OlMap({
      controls: defaultControls({
        rotate: !this.context.stateManager.state.interface.isMobile,
        zoom: !this.context.stateManager.state.interface.isMobile
      }),
      layers: [],
      interactions: interactions
    });
  }

  public getMap() {
    if (!this.map) {
      this.createMap();
    }
    return this.map!;
  }

  /**
   * @returns an array of BaseLayer objects that should be printed and that are not in the layer tree.
   */
  public getLayersToPrint(): BaseLayer[] {
    return this.getMap()
      .getAllLayers()
      .filter((layer) => layer.get('addToPrintedLayers'));
  }

  public zoomToExtent(extent: Extent, minResolution?: number) {
    this.getMap().getView().fit(extent, {
      minResolution: minResolution
    });
  }
}
