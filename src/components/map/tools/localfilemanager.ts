import { Feature, Map } from 'ol';
import DragAndDrop from 'ol/interaction/DragAndDrop.js';
import { GPX, GeoJSON, IGC, KML, TopoJSON } from 'ol/format.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Geometry } from 'ol/geom';
import LayerLocalFile from '../../../models/layers/layerlocalfile';
import GroupLayer from '../../../models/layers/grouplayer';
import StateManager from '../../../tools/state/statemanager';
import { extend, intersects } from 'ol/extent';

class LocalFileManager {
  map: Map;

  stateManager: StateManager;

  activeLayers: Record<
    string,
    {
      layerFile: LayerLocalFile;
      olayer: VectorLayer<VectorSource<Feature<Geometry>>>;
    }
  > = {};

  layerGroup?: GroupLayer;
  layerGroupProxy?: GroupLayer;

  constructor(map: Map) {
    this.map = map;

    this.stateManager = StateManager.getInstance();
    this.registerEvents();

    // Add drag n drop interaction to add local files
    const dragAndDropInteraction = this.createInteraction();
    this.map.addInteraction(dragAndDropInteraction);
  }

  private registerEvents(): void {
    this.stateManager.subscribe('layers.layersList', (oldLayers, newLayers) => {
      if (oldLayers.includes(this.layerGroup) && !newLayers.includes(this.layerGroup)) {
        // Group was deleted in tree, cleanup references
        delete this.layerGroupProxy;
        delete this.layerGroup;
      }
    });
  }

  createInteraction() {
    const dragAndDropInteraction = new DragAndDrop({
      // @ts-expect-error ol Format types
      formatConstructors: [GPX, GeoJSON, IGC, new KML({ extractStyles: true }), TopoJSON]
    });
    dragAndDropInteraction.on('addfeatures', (e) => {
      if (!this.layerGroup) {
        this.layerGroup = new GroupLayer(0, 'Local Files', 0, { isDefaultChecked: true, isDefaultExpanded: true });
      }
      // Check if all features can be displayed in the current map maximum extent
      // This will also approximately validate if the SRID is correct
      const featureType = e.file.name.replace('.', '_');
      const acceptableFeatures = this.validateAndCompleteFeatures(featureType, e.features as Feature<Geometry>[]);
      // Create Layer
      const layer = new LayerLocalFile(e.file, acceptableFeatures.features, acceptableFeatures.globalExtent!);
      layer.parent = this.layerGroup;
      if (e.features && e.features.length > acceptableFeatures.features.length) {
        // Some features are outer extent
        layer.hasError = true;
        layer.errorMessage = `Only ${acceptableFeatures.features.length} features among ${e.features.length} could be loaded.
        Verify that those features can be displayed within the maximal extent configured in your application.`;
      }

      if (this.layerGroupProxy) {
        // If group is already in the treeview, add layer to the tree directly
        this.layerGroupProxy.children.push(layer);
      } else {
        // Otherwise, add the layer to the group
        this.layerGroup.children.push(layer);
        // then add the group to the treeview
        this.stateManager.state.layers.layersList.push(this.layerGroup);
        // Save a reference to the proxy object in the tree for next time a file is added
        this.layerGroupProxy = this.stateManager.state.layers.layersList.find(
          (l) => l.treeItemId === this.layerGroup!.treeItemId
        ) as GroupLayer;
      }
    });

    return dragAndDropInteraction;
  }

  validateAndCompleteFeatures(featureType: string, features: Feature<Geometry>[]) {
    const validatedFeatures: Feature<Geometry>[] = [];
    const maxExtent = this.map.getView().get('extent');
    let counter = 0;

    let globalExtent = null;

    for (const feature of features) {
      const geometry = feature.getGeometry();
      if (geometry) {
        const featureExtent = geometry.getExtent();
        if (intersects(maxExtent, featureExtent)) {
          // Set an id that looks like ids from WFS qureries in order to make the usage easy in the others components that understand WFS Features
          feature.setId(`${featureType}.${++counter}`);
          validatedFeatures.push(feature);
          globalExtent = globalExtent == null ? [...featureExtent] : extend(globalExtent, featureExtent);
        }
      }
    }

    return {
      features: validatedFeatures,
      globalExtent: globalExtent
    };
  }

  addLayer(layerFile: LayerLocalFile) {
    const vectorSource = new VectorSource({
      features: layerFile._features
    });
    const olayer = new VectorLayer({
      source: vectorSource
    });
    this.map.addLayer(olayer);
    this.activeLayers[layerFile.treeItemId] = { layerFile: layerFile, olayer: olayer };
  }

  getLayer(layerFile: LayerLocalFile) {
    if (this.layerExists(layerFile)) {
      return this.activeLayers[layerFile.treeItemId].olayer;
    }
    return null;
  }

  removeLayer(layerFile: LayerLocalFile) {
    if (this.layerExists(layerFile)) {
      const olayer = this.activeLayers[layerFile.treeItemId].olayer;
      delete this.activeLayers[layerFile.treeItemId];
      this.map.removeLayer(olayer);
    } else {
      throw new Error('Cannot remove this layer: it does not exist');
    }
  }

  layerExists(layer: LayerLocalFile) {
    return layer.treeItemId in this.activeLayers;
  }

  selectFeatures(extent: number[]) {
    for (const activeLayer of Object.values(this.activeLayers)) {
      const features = activeLayer.olayer.getSource()?.getFeaturesInExtent(extent);
      if (features && features.length > 0) {
        this.stateManager.state.selection.selectedFeatures.push(...features);
        this.stateManager.state.interface.selectionComponentVisible = true;
      }
    }
  }
}

export default LocalFileManager;
