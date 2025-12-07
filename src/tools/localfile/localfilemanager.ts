import GirafeSingleton from '../../base/GirafeSingleton';
import { Feature, Map } from 'ol';
import DragAndDrop from 'ol/interaction/DragAndDrop.js';
import { GPX, GeoJSON, IGC, KML, TopoJSON } from 'ol/format.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Geometry } from 'ol/geom';
import LayerLocalFile from '../../models/layers/layerlocalfile';
import { extend, intersects } from 'ol/extent';
import IGirafeContext from '../context/icontext';
import { applyFeaturesToSelection } from '../utils/utils';

class LocalFileManager extends GirafeSingleton {
  private readonly map: Map;
  name: string;

  private readonly supportedFileFormats = [GPX, GeoJSON, IGC, new KML({ extractStyles: true }), TopoJSON];
  private readonly supportedFileExtensions = ['gpx', 'geojson', 'igc', 'kml', 'topojson', 'json'];

  activeLayers: Record<
    string,
    {
      layerFile: LayerLocalFile;
      olayer: VectorLayer<VectorSource<Feature<Geometry>>>;
    }
  > = {};

  constructor(context: IGirafeContext) {
    super(context);
    this.map = this.context.mapManager.getMap();
    this.name = `localFileManager`;
  }

  override initializeSingleton(): void {
    this.registerEvents();
    // Add drag n drop interaction to add local files
    const dragAndDropInteraction = this.createInteraction();
    this.map.addInteraction(dragAndDropInteraction);
  }

  private registerEvents(): void {
    this.context.userInteractionManager.registerListener('map.drop', false, this.name);
  }

  createInteraction() {
    // Handle dropping of unsupported files
    this.map.getViewport().addEventListener('drop', (event) => this.handleUnsupportedFiles(event));

    const dragAndDropInteraction = new DragAndDrop({
      // @ts-expect-error ol Format types
      formatConstructors: this.supportedFileFormats
    });

    dragAndDropInteraction.on('addfeatures', (e) => {
      if (!this.context.userInteractionManager.canListenerExecute('map.drop', this.name)) return;

      this.loadLocalFileFeatures(e.file, e.features as Feature<Geometry>[]);
    });
    return dragAndDropInteraction;
  }

  async loadLocalFile(localFile: File) {
    const text = await localFile.text();
    let reader = null;
    if (text.includes('<kml') && text.includes('</kml>')) {
      reader = new KML({ extractStyles: true });
    } else if (text.includes('<gpx') && text.includes('</gpx>')) {
      reader = new GPX();
    } else if (text.startsWith('{') && text.endsWith('}')) {
      reader = new GeoJSON();
    } else {
      // dot nothing - shall we report an error ??
      return;
    }
    const features = reader.readFeatures(text, { featureProjection: this.context.stateManager.state.projection });
    this.loadLocalFileFeatures(localFile, features);
  }

  loadLocalFileFeatures(localFile: File, features: Feature<Geometry>[]) {
    // Check if all features can be displayed in the current map maximum extent
    // This will also approximately validate if the SRID is correct
    const featureType = localFile.name.replace('.', '_');
    const acceptableFeatures = this.validateAndCompleteFeatures(featureType, features);
    // Create Layer
    if (acceptableFeatures.globalExtent === null) {
      const title = this.context.i18nManager.getTranslation('No features within map extent');
      const msg = this.context.i18nManager.getTranslation(
        'No features where found in your file that could be displayed within the maximal extent configured in your application.'
      );
      window.gAlert(msg, title);
      return;
    }
    const layer = new LayerLocalFile(
      localFile,
      acceptableFeatures.features,
      acceptableFeatures.globalExtent,
      this.context.configManager.Config.general.locale
    );

    if (features && features.length > acceptableFeatures.features.length) {
      // Some features are outer extent
      layer.hasError = true;
      layer.errorMessage = `Only ${acceptableFeatures.features.length} features among ${features.length} could be loaded.
Verify that those features can be displayed within the maximal extent configured in your application.`;
    }
    this.context.userLayerManager.addUserLayerToTree(layer);
  }

  private handleUnsupportedFiles(dropEvent: DragEvent) {
    if (!this.context.userInteractionManager.canListenerExecute('map.drop', this.name)) return;

    const files: FileList | undefined = dropEvent.dataTransfer?.files;
    if (!files?.length) {
      return;
    }
    const unsupportedFiles = Array.from(files).filter(
      (file) => !this.supportedFileExtensions.includes(file.name.split('.').at(-1)!.toLowerCase())
    );
    if (!unsupportedFiles?.length) {
      return;
    }
    let msg;
    if (unsupportedFiles.length > 1) {
      msg = this.context.i18nManager.getTranslation('Files _fileNames_ are not supported');
      msg = msg.replace('_fileNames_', unsupportedFiles.map((f) => `"${f.name}"`).join(', '));
    } else {
      msg = this.context.i18nManager.getTranslation('File _fileName_ is not supported');
      msg = msg.replace('_fileName_', `"${unsupportedFiles[0].name}"`);
    }
    void window.gAlert(msg, 'Unsupported file format');
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
        applyFeaturesToSelection(features, this.context.stateManager.state);
      }
    }
  }
  changeOpacity(layer: LayerLocalFile) {
    const oLayer = this.activeLayers[layer.treeItemId].olayer;
    oLayer.setOpacity(layer.opacity);
  }
}

export default LocalFileManager;
