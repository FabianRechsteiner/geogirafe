import { Map } from 'ol';
import LayerDrawing from '../../../models/layers/layerdrawing';
import VectorLayer from 'ol/layer/Vector';
import StateManager from '../../../tools/state/statemanager';
import GirafeSingleton from '../../../base/GirafeSingleton';
import MapManager from '../../../tools/state/mapManager';

export default class DrawingManager extends GirafeSingleton {
  map: Map;
  stateManager: StateManager;
  activeLayers: Record<
    string,
    {
      olayer: VectorLayer;
      layer: LayerDrawing;
    }
  > = {};

  constructor(type: string) {
    super(type);
    this.map = MapManager.getInstance().getMap();
    this.stateManager = StateManager.getInstance();
  }

  addLayer(layer: LayerDrawing) {
    let oLayer = this.getLayer(layer);
    if (!oLayer) {
      oLayer = layer._oLayer;
      this.activeLayers[layer.treeItemId] = { layer: layer, olayer: oLayer };
    }
    if (!this.map.getLayers().getArray().includes(oLayer)) {
      this.map.addLayer(oLayer);
    }
  }

  removeLayer(layer: LayerDrawing) {
    if (this.layerExists(layer)) {
      const oLayer = this.activeLayers[layer.treeItemId].olayer;
      this.map.removeLayer(oLayer);
    } else {
      throw new Error('Cannot remove this layer: it does not exist');
    }
  }

  getLayer(layer: LayerDrawing): VectorLayer | null {
    if (this.layerExists(layer)) {
      return this.activeLayers[layer.treeItemId].olayer;
    }
    return null;
  }

  changeOpacity(layer: LayerDrawing) {
    const oLayer = this.activeLayers[layer.treeItemId].olayer;
    oLayer.setOpacity(layer.opacity);
  }

  layerExists(layer: LayerDrawing) {
    return layer.treeItemId in this.activeLayers;
  }
}
