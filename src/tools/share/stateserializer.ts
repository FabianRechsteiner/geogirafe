import { BaseLayer, GroupLayer, Layer } from '../../models/main';
import { SharedFeature, SharedLayer, SharedState } from './sharedstate';
import LZString from 'lz-string';
import { LayerManager, RedliningFeature, State } from '../main';
import FeatureSerializer from './featureserializer';

class StateSerializer {
  layerManager: LayerManager;

  constructor() {
    this.layerManager = LayerManager.getInstance();
  }

  public getSerializedState(state: State) {
    // We want to save the following objects :
    // TODO REG : Export swiped layers
    // TODO REG : Export Cesium camera position
    // TODO REG : Export projection
    // TODO REG : Do we want to export the configuration of the interface ? (what panel is open, treeview width, ...)

    // Treeview configuration and layers
    const sharedLayers = this.getSerializedLayerTree(state.layers.layersList);

    // Drawn features
    const sharedFeatures = this.getSerializedDrawnFeatures(state.redlining.features);

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
      l: sharedLayers,
      f: sharedFeatures
    };

    // Is there a basemap ?
    if (state.activeBasemap) {
      sharedState.b = { i: state.activeBasemap.id };
    }

    const stringState = JSON.stringify(sharedState);
    const compressedState = LZString.compressToBase64(stringState);
    return compressedState;
  }

  private getSerializedLayerTree(layers: BaseLayer[]) {
    const sharedLayers = [];
    for (const layer of layers) {
      const sharedLayer = this.getSerializedLayer(layer);
      sharedLayers.push(sharedLayer);
    }
    return sharedLayers;
  }

  private getSerializedLayer(layer: BaseLayer): SharedLayer {
    let isExpanded = false;
    if (layer instanceof GroupLayer) {
      isExpanded = layer.isExpanded;
    } else if (layer instanceof Layer && this.layerManager.isLayerWithLegend(layer)) {
      isExpanded = layer.isLegendExpanded;
    }

    // Manage children
    const sharedChildren: SharedLayer[] = [];
    if (layer instanceof GroupLayer) {
      for (const child of layer.children) {
        const sharedChild = this.getSerializedLayer(child);
        sharedChildren.push(sharedChild);
      }
    }

    return {
      i: layer.id,
      o: layer.order,
      c: Number(layer.active),
      e: Number(isExpanded),
      z: sharedChildren
    };
  }

  private getSerializedDrawnFeatures(features: RedliningFeature[]): SharedFeature[] {
    const olFeatures = features.map((f: RedliningFeature) => f._olFeature);
    // TODO REG: Configure the geometry precision in the configuration depending on the SRID.
    return new FeatureSerializer(3).getSerializedFeatures(olFeatures);
  }
}

export default StateSerializer;
