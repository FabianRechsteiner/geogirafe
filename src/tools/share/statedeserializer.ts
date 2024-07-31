import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import Layer from '../../models/layers/layer';
import { SharedLayer, SharedState } from './sharedstate';
import LZString from 'lz-string';
import LayerManager from '../layermanager';
import StateManager from '../state/statemanager';

import ComponentManager from '../state/componentManager';
import ThemeLayer from '../../models/layers/themelayer';

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
    const deserializedLayers = this.getDeserializedLayerTree(sharedState.l);
    for (const deserializedLayer of deserializedLayers) {
      this.state.layers.layersList.push(deserializedLayer);
    }

    // Set drawn objects
    const drawingComponents = ComponentManager.getInstance().getComponentsByName('drawing');
    if (drawingComponents != undefined && sharedState.f != undefined) {
      drawingComponents[0].deserialize(sharedState.f);
    }
  }

  public getDeserializedLayerTree(sharedLayers: SharedLayer[]) {
    const layersList: BaseLayer[] = [];
    for (const sharedLayer of sharedLayers) {
      const layer = this.findBaseLayerById(sharedLayer.i);
      if (layer) {
        this.deserializeLayer(layer, sharedLayer);
        layersList.push(layer);
      } else {
        // TODO REG : Add infobox ?
        console.warn(`Cannot find layer with id ${sharedLayer.i} in the available layers`);
      }
    }
    return layersList;
  }

  private deserializeLayer(layer: BaseLayer, sharedLayer: SharedLayer) {
    layer.order = sharedLayer.o;
    layer.isDefaultChecked = Boolean(sharedLayer.c);
    if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
      layer.isExpanded = Boolean(sharedLayer.e);
      // Manage children
      // Ad remove unnecessary childs
      for (let i = layer.children.length - 1; i >= 0; i--) {
        const child = layer.children[i];
        const serializedChild = sharedLayer.z.find((l) => l.i == child.id);
        if (serializedChild) {
          this.deserializeLayer(child, serializedChild);
        } else {
          // This child exists in the original layer, but not in the shared state.
          // => We have to remove it from the current object
          layer.children.splice(i, 1);
        }
      }
    } else if (layer instanceof Layer && this.layerManager.isLayerWithLegend(layer)) {
      layer.isLegendExpanded = Boolean(sharedLayer.e);
    }
  }

  private findBaseLayerById(layerId: number): BaseLayer | null {
    for (const theme of Object.values(this.state.themes._allThemes)) {
      const layer = this.findLayerRecursive(theme, layerId);
      if (layer) {
        return layer;
      }
    }
    return null;
  }

  private findLayerRecursive(layer: BaseLayer, layerId: number): BaseLayer | null {
    if (layer.id === layerId) {
      // When deserializing the layer, we clone it,
      // otherwise the following operation will also
      // affect the layer referenced in other themes
      const foundLayer = layer.clone();
      return foundLayer;
    }

    // Else, we call recursively on the children
    if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
      for (const childLayer of layer.children) {
        const foundChild = this.findLayerRecursive(childLayer, layerId);
        if (foundChild) {
          return foundChild;
        }
      }
    }
    return null;
  }
}

export default StateDeserializer;
