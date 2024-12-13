import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import Layer from '../../models/layers/layer';
import { SharedLayer, SharedState } from './sharedstate';
import LZString from 'lz-string';
import LayerManager from '../layermanager';
import State from '../state/state';
import ComponentManager from '../state/componentManager';
import ThemeLayer from '../../models/layers/themelayer';
import ThemesHelper from '../themes/themeshelper';

class StateSerializer {
  layerManager: LayerManager;
  themesHelper: ThemesHelper;

  constructor() {
    this.layerManager = LayerManager.getInstance();
    this.themesHelper = ThemesHelper.getInstance();
  }

  public getSerializedState(state: State) {
    // We want to save the following objects :
    // TODO REG : Export swiped layers
    // TODO REG : Export Cesium camera position
    // TODO REG : Export projection
    // TODO REG : Do we want to export the configuration of the interface ? (what panel is open, treeview width, ...)

    // Treeview configuration and layers
    const sharedLayers = this.getSerializedLayerTree(state.layers.layersList);

    // Position, Advanced mode, Globe, Basemap
    const sharedState: SharedState = {
      p: {
        c: state.position.center,
        r: state.position.resolution
      },
      t: {
        a: Number(state.treeview.advanced)
      },
      g: {
        d: state.globe.display
      },
      l: sharedLayers
    };

    // Drawn features
    const drawingComponents = ComponentManager.getInstance().getComponentsByName('drawing');
    if (drawingComponents != undefined) {
      sharedState.f = drawingComponents[0].serialize();
    }

    // Is there a basemap ?
    if (state.activeBasemap) {
      sharedState.b = { i: state.activeBasemap.id };
    }

    const stringState = JSON.stringify(sharedState);
    const compressedState = LZString.compressToBase64(stringState);
    return compressedState;
  }

  public getSerializedLayerTree(layers: BaseLayer[]) {
    const sharedLayers = [];
    for (const layer of layers) {
      const sharedLayer = this.getSerializedLayer(layer);
      sharedLayers.push(sharedLayer);
    }
    return sharedLayers;
  }

  private getSerializedLayer(layer: BaseLayer): SharedLayer {
    let isExpanded = false;
    if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
      isExpanded = layer.isExpanded;
    } else if (layer instanceof Layer && this.layerManager.isLayerWithLegend(layer)) {
      isExpanded = layer.isLegendExpanded;
    }

    // Manage children
    const sharedChildren: SharedLayer[] = [];
    const removedChildren: number[] = [];
    if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
      // First get the original version of the object
      const originalLayer = this.themesHelper.findBaseLayerById(layer.id) as GroupLayer | ThemeLayer; // Is always of this type.
      for (const child of originalLayer.children) {
        const index = layer.children.findIndex((el) => el.id === child.id);
        if (index >= 0) {
          // Element was found => it is still in the list
          const sharedChild = this.getSerializedLayer(layer.children[index]);
          sharedChildren.push(sharedChild);
        } else {
          removedChildren.push(child.id);
        }
      }
    }

    return {
      i: layer.id,
      o: layer.order,
      c: Number(layer.active),
      e: Number(isExpanded),
      z: sharedChildren,
      x: removedChildren
    };
  }
}

export default StateSerializer;
