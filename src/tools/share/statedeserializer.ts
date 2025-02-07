import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import Layer from '../../models/layers/layer';
import { SharedLayer, SharedState } from './sharedstate';
import LZString from 'lz-string';
import LayerManager from '../layers/layermanager';
import StateManager from '../state/statemanager';
import ComponentManager from '../state/componentManager';
import ThemeLayer from '../../models/layers/themelayer';
import ErrorManager from '../error/errormanager';

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
    // First: clear the current layers list
    for (const layer of this.stateManager.state.layers.layersList) {
      this.layerManager.toggle(layer, 'off');
    }
    this.state.layers.layersList = [];

    const stringState = LZString.decompressFromBase64(compressedState);
    const sharedState: SharedState = JSON.parse(stringState);

    this.state.projection = sharedState.m.p;
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
        console.warn(`Cannot find layer with id ${sharedLayer.i} in the available layers`);
      }
    }
    return layersList;
  }

  private deserializeLayer(originalLayer: BaseLayer, sharedLayer: SharedLayer) {
    originalLayer.order = sharedLayer.o;
    originalLayer.isDefaultChecked = Boolean(sharedLayer.c);
    if (originalLayer instanceof GroupLayer || originalLayer instanceof ThemeLayer) {
      originalLayer.isExpanded = Boolean(sharedLayer.e);
      // Manage children
      this.removeUnnecessaryChilds(originalLayer, sharedLayer);
      this.checkUnknownLayers(sharedLayer, originalLayer);
    } else if (originalLayer instanceof Layer && this.layerManager.isLayerWithLegend(originalLayer)) {
      originalLayer.isLegendExpanded = Boolean(sharedLayer.e);
    }
  }

  private checkUnknownLayers(sharedLayer: SharedLayer, originalLayer: GroupLayer | ThemeLayer) {
    // If some layers are present in the shared state but cannot be found in the current list of available layers
    // It probably means that the layers are private ones or that the layer has been delete.
    // Add an infobox for this.
    for (const sharedChild of sharedLayer.z) {
      const originalChild = originalLayer.children.find((c) => c.id == sharedChild.i);
      if (!originalChild) {
        ErrorManager.getInstance().pushMessage(
          'unknown-layers-cannot-be-added',
          'Some layer could not be added to the layer-tree. This is either because you do not have the rights for it, or because this layer does not exist anymore.',
          'warning'
        );
      }
    }
  }

  private removeUnnecessaryChilds(originalLayer: GroupLayer | ThemeLayer, sharedLayer: SharedLayer) {
    let reorder = false;
    for (let i = originalLayer.children.length - 1; i >= 0; i--) {
      const child = originalLayer.children[i];
      const serializedChild = sharedLayer.z.find((l) => l.i == child.id);
      if (serializedChild) {
        this.deserializeLayer(child, serializedChild);
      } else {
        // This child exists in the original layer, but not in the shared state.
        // => If it is present in the x list, it was explicitely removed
        // And we can remove it from the current object
        const explicitlyRemoved = sharedLayer.x.find((id) => id == child.id);
        if (explicitlyRemoved) {
          originalLayer.children.splice(i, 1);
          console.debug(`Layer ${child.name} was removed from initial state`);
        } else {
          // Otherwise it is a new layer. We do not remove it
          // But we have to set the right order for it.
          // In this case we have to reorder all the layers at this level
          // In order to keep the order defined in the initial group
          console.debug(`Layer ${child.name} will be added to the treeview because it is new`);
          console.debug(`Layer ${originalLayer.name} needs a reorering of its children`);
          reorder = true;
        }
      }
    }

    if (reorder) {
      console.debug(`Reordering childs for layer ${originalLayer.name}`);
      let order = 1;
      for (const child of originalLayer.children) {
        child.order = order++;
      }
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
