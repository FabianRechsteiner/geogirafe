import GirafeSingleton from '../../base/GirafeSingleton';
import ISnappingConfig from '../../tools/snap/isnapconfig';
import { isSnappableLayer, SnappableLayer } from '../../models/layers/snappablelayer';
import SelectionParam from '../../models/selectionparam';
import StateManager from '../state/statemanager';

import LayerManager from './layermanager';
import MapManager from '../../tools/state/mapManager';
import WfsManager from '../../tools/wfs/wfsmanager';

import Snap from 'ol/interaction/Snap';
import { Collection, Feature, Map } from 'ol';

type SnapLayer = {
  active: boolean;
  featuresLoaded: boolean;
  snapInteraction: Snap;
  snapFeatures: Collection<Feature>;
};

class SnapManager extends GirafeSingleton {
  private readonly snapLayers: { [uid: string]: SnapLayer } = {};
  stateManager: StateManager;

  constructor(type: string) {
    super(type);

    this.stateManager = StateManager.getInstance();
    this.stateManager.subscribe(
      /layers\.layersList\..*\.activeState/,
      (_oldActive: string, _newActive: string, layer: SnappableLayer) => {
        if (isSnappableLayer(layer)) {
          if (_newActive === 'on') {
            this.addLayer(layer);
          } else {
            this.removeLayer(layer);
          }
        }
      }
    );
    this.stateManager.subscribe(/snapActive/, (_old, _new, _parent) => {
      if (_new) {
        this.registerListeners();
      } else {
        this.unregisterListeners();
      }
      this.removeAllSnaps();
      if (_new) {
        this.insertAllSnaps();
        this.loadMissingFeatures();
      }
    });
    this.stateManager.subscribe(
      /layers\.layersList\..*\.snapActive/,
      (_oldSnap: boolean, _newSnap: boolean, layer: SnappableLayer) => {
        if (isSnappableLayer(layer)) {
          this.toggleSnap(layer, _newSnap);
          if (_newSnap) {
            // Refresh and move on top of interaction stack, to be usable with drawing interaction
            this.removeSnapById(layer.treeItemId);
            this.insertSnapById(layer.treeItemId);
          }
        }
      }
    );
  }

  private get layerManager(): LayerManager {
    return LayerManager.getInstance();
  }

  private get olMap(): Map {
    return MapManager.getInstance().getMap();
  }

  private toggleSnap(layer: SnappableLayer, active: boolean) {
    const layerId = layer.treeItemId;
    if (!(layerId in this.snapLayers)) {
      this.addLayer(layer);
    }
    const snapLayer = this.snapLayers[layerId];
    snapLayer.active = active;
    snapLayer.snapInteraction.setActive(active);
  }

  public removeSnapById(layerId: string) {
    this.removeSnap(this.snapLayers[layerId]);
  }

  public removeAllSnaps() {
    Object.values(this.snapLayers).forEach((l) => this.removeSnap(l));
  }

  public insertSnapById(layerId: string) {
    this.insertSnap(this.snapLayers[layerId]);
    this.loadFeaturesForLayer(layerId, this.snapLayers[layerId]);
  }

  public insertAllSnaps() {
    Object.values(this.snapLayers).forEach((layer) => this.insertSnap(layer));
    this.loadMissingFeatures();
  }

  public addLayer(layer: SnappableLayer) {
    const snapFeatures = new Collection<Feature>();
    const options = layer.snapOptions || {};
    const interaction = this.createSnap(options, snapFeatures);
    const newSnapLayer = {
      active: layer.snapActive || false,
      featuresLoaded: false,
      snapInteraction: interaction,
      snapFeatures: snapFeatures
    };
    this.snapLayers[layer.treeItemId] = newSnapLayer;
    this.loadFeaturesForLayer(layer.treeItemId, newSnapLayer);
    this.insertSnap(newSnapLayer);
  }

  public removeLayer(layer: SnappableLayer) {
    if (layer.treeItemId in this.snapLayers) {
      const snapLayer = this.snapLayers[layer.treeItemId];
      this.removeSnap(snapLayer);
      delete this.snapLayers[layer.treeItemId];
    }
  }

  private createSnap(options: ISnappingConfig, features: Collection<Feature>) {
    const snap = new Snap({
      edge: options.edge,
      features: features,
      pixelTolerance: options.tolerance,
      vertex: options.vertex
    });
    return snap;
  }

  private insertSnap(snapLayer: SnapLayer) {
    if (snapLayer.active) {
      this.olMap.addInteraction(snapLayer.snapInteraction);
    }
  }

  private removeSnap(snapLayer: SnapLayer) {
    this.olMap.removeInteraction(snapLayer.snapInteraction);
  }

  private registerListeners() {
    this.olMap.getView().on('change', this.viewChangeHandler);
  }

  private unregisterListeners() {
    this.olMap.getView().un('change', this.viewChangeHandler);
  }

  private readonly viewChangeHandler = () => this.reloadFeatures();

  private reloadFeatures() {
    this.clearAllFeatures();
    this.loadMissingFeatures();
  }

  private clearAllFeatures() {
    Object.values(this.snapLayers).forEach((l) => {
      l.featuresLoaded = false;
      l.snapFeatures.clear();
    });
  }

  private loadMissingFeatures() {
    Object.entries(this.snapLayers).forEach(([id, l]) => this.loadFeaturesForLayer(id, l));
  }

  private loadFeaturesForLayer(treeId: string, layer: SnapLayer) {
    if (layer.active && !layer.featuresLoaded) {
      const treeItem: SnappableLayer = this.layerManager.getTreeItem(treeId) as SnappableLayer;
      const client = WfsManager.getInstance().getClient(treeItem.ogcServer);
      const extent = this.olMap.getView().getViewStateAndExtent().extent;
      const selectionParam = new SelectionParam(treeItem.ogcServer, [treeItem], this.state.projection, extent);
      client.getFeature(selectionParam).then((r) => {
        layer.snapFeatures.clear();
        layer.snapFeatures.extend(r);
        layer.featuresLoaded = true;
      });
    }
  }

  get state() {
    return this.stateManager.state;
  }
}

export default SnapManager;
