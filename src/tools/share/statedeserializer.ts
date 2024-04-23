import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import Layer from '../../models/layers/layer';
import { SharedLayer, SharedState } from './sharedstate';
import LZString from 'lz-string';
import LayerManager from '../layermanager';
import StateManager from '../state/statemanager';

import ComponentManager from '../state/componentManager';

class StateDeserializer {
  stateManager: StateManager;
  layerManager: LayerManager;
  componentManager: ComponentManager;

  constructor() {
    this.stateManager = StateManager.getInstance();
    this.layerManager = LayerManager.getInstance();
    this.componentManager = ComponentManager.getInstance();
  }

  get state() {
    return this.stateManager.state;
  }

  public deserializeAndSetState(compressedState: string) {
    const stringState = LZString.decompressFromBase64(compressedState);
    const sharedState: SharedState = JSON.parse(stringState);

    // TODO REG : Today only default SRID is managed. The coordinates here can have invalid format.

    this.state.position.center = sharedState.p.c;
    this.state.position.resolution = sharedState.p.r;
    this.state.treeview.advanced = Boolean(sharedState.t.a);
    this.state.globe.display = sharedState.g.d;

    // Set basemap if any
    if (sharedState.b) {
      const basemap = Object.values(this.state.basemaps).find((b) => b.id === sharedState.b!.i);
      if (basemap) {
        if (basemap.projection) {
          this.state.projection = basemap.projection;
        }
        this.state.activeBasemap = basemap;
      } else {
        // TODO REG : Add infobox ?
        console.warn(`Cannot find basemap with id ${sharedState.b.i} in the available basemaps`);
      }
    }

    // Set all layers
    for (const sharedLayer of sharedState.l) {
      const layer = this.deserializeLayer(sharedLayer);
      if (layer) {
        this.state.layers.layersList.push(layer);
      } else {
        // TODO REG : Add infobox ?
        console.warn(`Cannot find layer with id ${sharedLayer.i} in the available layers`);
      }
    }

    // Set drawn objects
    const redliningComponents = ComponentManager.getInstance().getComponentsByName('redlining');
    if (redliningComponents != undefined && sharedState.f != undefined) {
      redliningComponents[0].deserialize(sharedState.f);
    }
  }

  private deserializeLayer(sharedLayer: SharedLayer) {
    const layer = this.findBaseLayerById(sharedLayer.i);
    if (layer) {
      layer.order = sharedLayer.o;
      layer.isDefaultChecked = Boolean(sharedLayer.c);
      if (layer instanceof GroupLayer) {
        layer.isExpanded = Boolean(sharedLayer.e);
      } else if (layer instanceof Layer && this.layerManager.isLayerWithLegend(layer)) {
        layer.isLegendExpanded = Boolean(sharedLayer.e);
      }

      // Manage children
      // TODO REG : Today we do not manage if a layer was remove from the group.
      for (const sharedChild of sharedLayer.z) {
        const child = this.deserializeLayer(sharedChild);
        if (!child) {
          console.warn(`Cannot find layer with id ${sharedChild.i} in the available layers`);
        }
      }

      return layer;
    }

    return null;
  }

  private findBaseLayerById(layerId: number): BaseLayer | null {
    for (const theme of Object.values(this.state.themes)) {
      const layer = this.findLayerRecursive(theme._layersTree, layerId);
      if (layer) {
        return layer;
      }
    }
    return null;
  }

  private findLayerRecursive(layers: BaseLayer[], layerId: number): BaseLayer | null {
    for (const layer of layers) {
      if (layer.id === layerId) {
        return layer;
      }
      if (layer instanceof GroupLayer) {
        const child = this.findLayerRecursive(layer.children, layerId);
        if (child) {
          return child;
        }
      }
    }
    return null;
  }
}

export default StateDeserializer;
