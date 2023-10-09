import Map from 'ol/Map';

import VectorSource from 'ol/source/Vector';
import Style, { StyleLike } from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Circle from 'ol/style/Circle';
import VectorLayer from 'ol/layer/Vector';
import Collection, { CollectionEvent } from 'ol/Collection';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { Modify, Snap, DragBox } from 'ol/interaction';
import Draw, { createBox, createRegularPolygon } from 'ol/interaction/Draw';
import { ProjectionLike, get as getProjection } from 'ol/proj';
import adjectives from 'adjectives';
import { getVectorContext } from 'ol/render';
import { easeOut } from 'ol/easing';
import { unByKey } from 'ol/Observable';
import OLCesium from 'olcs/OLCesium';
import { v4 as uuidv4 } from 'uuid';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import GeoEvents from '../../models/events';
import MaskLayer from './tools/maskLayer';
import SwipeManager from './tools/swipemanager';
import WmsManager from './tools/wmsmanager';
import OsmManager from './tools/osmmanager';
import VectorTilesManager from './tools/vectortilesmanager';
import WmtsManager from './tools/wmtsmanager';
import ViewManager from './tools/viewmanager';
import RedliningFeature from '../../tools/state/redliningfeature';
import Basemap from '../../models/basemap';
import { Feature, MapBrowserEvent, MapEvent } from 'ol';
import { Geometry } from 'ol/geom';
import { EventsKey } from 'ol/events';
import RenderEvent from 'ol/render/Event';
import { Coordinate } from 'ol/coordinate';
import Layer from '../../models/layers/layer';
import { Type } from 'ol/geom/Geometry';
import { DragBoxEvent } from 'ol/interaction/DragBox';
import { Extent } from 'ol/extent';
import { Cesium3DTileset, CesiumTerrainProvider } from 'cesium';
import LayerOsm from '../../models/layers/layerosm';
import LayerVectorTiles from '../../models/layers/layervectortiles';
import LayerWmts from '../../models/layers/layerwmts';
import LayerWms from '../../models/layers/layerwms';

// read this about the import of olcesium / cesium: https://github.com/openlayers/ol-cesium/issues/953
// TODO REG: Problem : we import the cesium twice : one in the bundle, and another one with a scripts tag
// How to solve this ?

class MapComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  map!: Map;
  mapTarget!: HTMLDivElement;
  map3d!: any;
  map3dTarget!: HTMLDivElement;
  swiper!: HTMLInputElement;
  swipeManager!: SwipeManager;
  wmtsManager!: WmtsManager;
  wmsManager!: WmsManager;
  osmManager!: OsmManager;
  viewManager!: ViewManager;
  vectorTilesManager!: VectorTilesManager;

  srid!: ProjectionLike;
  get projection() {
    return getProjection(this.srid);
  }

  // For Redlining
  redliningFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  redliningSource!: VectorSource;
  redliningLayer: VectorLayer<VectorSource> | null = null;
  draw: Draw | null = null;
  snap!: Snap;

  // For object selection
  selectedFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  focusedFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  selectionLayer!: VectorLayer<VectorSource>;
  focusLayer!: VectorLayer<VectorSource>;
  focusAnimation: EventsKey | null = null;
  pixelTolerance = 10;
  dragbox!: DragBox;

  // For print
  maskLayer = new MaskLayer({ name: 'PrintMask' });

  constructor() {
    super('map');
  }

  registerEvents() {
    this.messageManager.register(this.onCustomGirafeEvent.bind(this));

    this.swiper.addEventListener('input', () => this.map.render());

    this.stateManager.subscribe('activeBasemap', (_oldBasemap: Basemap, newBasemap: Basemap) => this.onChangeBasemap(newBasemap));
    this.stateManager.subscribe('projection', (_oldProjection: string, newProjection: string) => this.onChangeProjection(newProjection));
    this.stateManager.subscribe('interface.darkMode', (_oldValue: boolean, _newValue: boolean) => this.onChangeDarkMode());
    this.stateManager.subscribe('position.scale', (_oldScale: number, newScale: number) => this.onChangeScale(newScale));
    this.stateManager.subscribe('position.resolution', (_oldResolution: number, newResolution: number) => this.zoomToResolution(newResolution));
    this.stateManager.subscribe('position.center', (_oldCenter: Coordinate, newCenter: Coordinate) => this.panToCoordinate(newCenter));
    this.stateManager.subscribe('selectedFeatures', (_oldFeatures: Feature[], newFeatures: Feature[]) => this.onFeaturesSelected(newFeatures));
    this.stateManager.subscribe('focusedFeature', (_oldFeature: Feature, newFeature: Feature) => this.onFeatureFocused(newFeature));
    this.stateManager.subscribe('layers.swipedLayers', (_oldLayers: {left: Layer[]; right: Layer[];}, newLayers: {left: Layer[]; right: Layer[];}) => this.onSwipedLayersChanged(newLayers));

    this.stateManager.subscribe('redlining.activeTool', (_oldTool: string | null, newTool: string | null) => this.onRedliningToolChanged(newTool));
    this.stateManager.subscribe('redlining.features', (oldFeatures: RedliningFeature[], newFeatures: RedliningFeature[]) => this.onFeaturesChanged(oldFeatures, newFeatures));

    this.stateManager.subscribe('interface.printPanelVisible', (_oldValue: boolean, newValue: boolean) => this.onPrintPanelToggled(newValue));
    this.stateManager.subscribe('print.*', () => this.onPrintStateChanged());

    this.stateManager.subscribe('globe.display', () => this.onGlobeToggled());

    this.stateManager.subscribe('layers\.layersList\..*\.activeState', (_oldActive: boolean, _newActive: boolean, layer: Layer) => this.onLayerToggled(layer));
    this.stateManager.subscribe('layers\.layersList\..*\.opacity', (_oldOpacity: number, _newOpacity: number, layer: Layer) => this.onChangeOpacity(layer));
    this.stateManager.subscribe('layers\.layersList\..*\.order', () => this.onChangeOrder([]));
  }

  render() {
    super.render();

    this.srid = this.configManager.Config.map.srid;

    // Create map element
    this.mapTarget = this.shadow.getElementById('ol-map') as HTMLDivElement;
    this.map3dTarget = this.shadow.getElementById('cs-map') as HTMLDivElement;
    this.map = new Map({
      target: this.mapTarget,
      layers: []
    });
    // Share the map among the state
    this.state.olMap = this.map;

    // Initialize managers
    this.wmsManager = new WmsManager(this.map, this.srid);
    this.osmManager = new OsmManager(this.map, this.srid);
    this.viewManager = new ViewManager(this.map, this.srid);
    this.vectorTilesManager = new VectorTilesManager(this.map, this.srid);
    this.wmtsManager = new WmtsManager(this.map, this.srid);
    this.swiper = this.shadow.getElementById('swiper') as HTMLInputElement;
    this.swipeManager = new SwipeManager(this.map, this.swiper, this.wmtsManager, this.wmsManager);

    // View
    const view = this.viewManager.getView();
    this.map.setView(view);

    // Create vector source for drawing
    this.redliningSource = new VectorSource({
      features: this.redliningFeaturesCollection
    });
    this.redliningLayer = new VectorLayer({
      source: this.redliningSource,
      //style: (feature) => this.getDefaultStyle(feature)
    });
    this.map.addLayer(this.redliningLayer);
    this.redliningLayer.setZIndex(1001);

    // Create layer for selection
    const selectionSource = new VectorSource({
      features: this.selectedFeaturesCollection
    });

    this.configManager.loadConfig().then(() => { 
      this.selectionLayer = new VectorLayer({
        source: selectionSource,
        // TODO REG: Change default selection color
        style: new Style({
          stroke: new Stroke({ color: this.configManager.Config.selection.defaultStrokeColor, width: this.configManager.Config.selection.defaultStrokeWidth }),
          fill: new Fill({ color: this.configManager.Config.selection.defaultFillColor }),
          image: new Circle({
            radius: 7,
            fill: new Fill({ color: this.configManager.Config.selection.defaultFillColor }),
            stroke: new Stroke({ color: this.configManager.Config.selection.defaultStrokeColor, width: this.configManager.Config.selection.defaultStrokeWidth })
          })
        })
      });
      this.map.addLayer(this.selectionLayer);
      this.selectionLayer.setZIndex(1002);

      // Create layer for focus
      const focusSource = new VectorSource({
        features: this.focusedFeaturesCollection
      });
      focusSource.on('addfeature', (e) => { this.flash(e.feature!) });
      this.focusLayer = new VectorLayer({
        source: selectionSource,
        // TODO REG: Change default focus color
        style: new Style({
          stroke: new Stroke({ color: this.configManager.Config.selection.defaultFocusStrokeColor, width: this.configManager.Config.selection.defaultFocusStrokeWidth }),
          fill: new Fill({ color: this.configManager.Config.selection.defaultFocusFillColor }),
          image: new Circle({
            radius: 7,
            fill: new Fill({ color: this.configManager.Config.selection.defaultFocusFillColor }),
            stroke: new Stroke({ color: this.configManager.Config.selection.defaultFocusStrokeColor, width: this.configManager.Config.selection.defaultFocusStrokeWidth })
          })
        })
      });
      this.map.addLayer(this.focusLayer);
      this.focusLayer.setZIndex(1003);
    });

    // Add dragbox selection interaction
    this.dragbox = new DragBox({
      condition: platformModifierKeyOnly,
    });
    this.map.addInteraction(this.dragbox);
    this.dragbox.on('boxend', (e) => this.onDragSelection(e));

    // TODO REG: This is ugly, but I didn't find any other solution yet.
    setTimeout(() => {
      this.map.updateSize();
    }, 1000);
  }

  getDefaultStyle(feature: Feature) {

    const strokeColor = (feature.get('strokeColor')) ? feature.get('strokeColor') : this.configManager.Config.redlining.defaultStrokeColor;
    const strokeWidth = (feature.get('strokeWidth')) ? feature.get('strokeWidth') : this.configManager.Config.redlining.defaultStrokeWidth;
    const fillColor = (feature.get('fillColor')) ? feature.get('fillColor') : this.configManager.Config.redlining.defaultFillColor;
    const textSize = (feature.get('textSize')) ? feature.get('textSize') : this.configManager.Config.redlining.defaultTextSize;

    feature.set('strokeColor', strokeColor);
    feature.set('strokeWidth', strokeWidth);
    feature.set('fillColor', fillColor);
    feature.set('textSize', textSize);

    return new Style({
      stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
      fill: new Fill({ color: fillColor }),
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: strokeWidth })
      }),
      text: new Text({ text: feature.get('name'), font: 'Bold ' + textSize + 'px/1 ' + this.configManager.Config.redlining.defaultFont })
    });
  }

  listenOpenLayersEvents() {
    // https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html
    //this.map.on('change', (e) => console.log(e));
    this.map.on('singleclick', (e) => this.onClick(e));
    //this.map.on('click', (e) => console.log(e));
    //this.map.on('dblclick', (e) => console.log(e));
    //this.map.on('error', (e) => console.log(e));
    this.map.on('loadstart', (e) => this.onLoadStart(e));
    this.map.on('loadend', (e) => this.onLoadEnd(e));
    this.map.on('moveend', (e) => this.onMoveEnd(e));
    //this.map.on('movestart', (e) => console.log(e));
    //this.map.on('pointerdrag', (e) => console.log(e));
    this.map.on('pointermove', (e) => this.onPointerMove(e));
    //this.map.on('postcompose', (e) => console.log(e));
    //this.map.on('postrender', (e) => console.log(e));
    //this.map.on('precompose', (e) => console.log(e));
    //this.map.on('propertychange', (e) => console.log(e));
    //this.map.on('rendercomplete', (e) => this.onRenderComplete(e));
    //? change:layerGroup
    //? change:size
    //? change:target
    //? change:view

    // Drawing events
    this.redliningFeaturesCollection.on('add', (e) => this.onFeatureAdded(e));
  }

  onLoadStart(_e: MapEvent) {
    this.state.loading = true;
  }

  onLoadEnd(_e: MapEvent) {
    this.state.loading = false;
  }

  onPointerMove(e: MapBrowserEvent<UIEvent>) {
    this.state.mouseCoordinates = e.coordinate;
  }

  onMoveEnd(_e: MapEvent) {
    const view = this.map.getView();
    const center = view.getCenter()!;
    this.state.position.center = center;
    this.state.position.resolution = view.getResolution()!;
    this.state.position.scale = this.viewManager.getScale();
    this.state.position.zoom = view.getZoom()!;
  }

  onClick(e: MapBrowserEvent<UIEvent>) {
    // Build selectionbox using the default tolerance
    const topLeftPixel = [e.pixel[0] - this.pixelTolerance, e.pixel[1] - this.pixelTolerance];
    const topLeftCoord = this.map.getCoordinateFromPixel(topLeftPixel);
    const bottomRightPixel = [e.pixel[0] + this.pixelTolerance, e.pixel[1] + this.pixelTolerance];
    const bottomRightCoord = this.map.getCoordinateFromPixel(bottomRightPixel);
    const extent = [topLeftCoord[0], topLeftCoord[1], bottomRightCoord[0], bottomRightCoord[1]];

    // Today, only the selection on WMS Layer is managed
    this.wmsManager.selectFeatures(extent);
  }

  onDragSelection(_e: DragBoxEvent) {
    const extent = this.dragbox.getGeometry().getExtent();

    // Today, only the selection on WMS Layer is managed
    this.wmsManager.selectFeatures(extent);
  }

  flash(feature: Feature) {
    const duration = 2000;
    let startStart = Date.now();
    let start = startStart;
    const flashGeom = feature.getGeometry()!.clone();
    // First deactivate the current animation
    // (We only want one animated object)
    if (this.focusAnimation !== null) {
      unByKey(this.focusAnimation);
    }
    this.focusAnimation = this.selectionLayer.on('postrender', (e) => animate(this, e));

    function animate(_this: MapComponent, e: RenderEvent) {
      const frameState = e.frameState!;
      const elapsed = frameState.time - start;
      if (elapsed >= duration) {
        start = Date.now();
      }
      const vectorContext = getVectorContext(e);
      const elapsedRatio = elapsed / duration;
      // radius will be 5 at start and 30 at end.
      const radius = easeOut(elapsedRatio) * 25 + 5;
      const opacity = easeOut(1 - elapsedRatio);

      // For lines
      const elapsed2 = frameState.time - startStart;
      const offset = Math.floor(elapsed2 / 100) % 48;

      const style = new Style({
        image: new Circle({
          radius: radius,
          stroke: new Stroke({
            color: 'rgba(255, 0, 0, ' + opacity + ')',
            width: 0.25 + opacity,
          }),
        }),
        stroke: new Stroke({
          color: [255, 0, 0, 1],
          width: 12,
          lineDash: [16, 32],
          lineDashOffset: offset
        })
      });

      vectorContext.setStyle(style);
      vectorContext.drawGeometry(flashGeom);
      // tell OpenLayers to continue postrender animation
      _this.map.render();
    }
  }

  onFeatureAdded(e: CollectionEvent<Feature<Geometry>>) {

    const olFeature: Feature<Geometry> = e.element;
    olFeature.setId(uuidv4())
    // Set the default feature name
    const name = adjectives[this.getRandomInt(0, adjectives.length)] + ' ' + e.element!.getGeometry()!.getType();
    olFeature.set('name', name);
    // Add default style as a function, because we want the attributes (for example the name) to be evaluated on display time
    olFeature.setStyle(((feature: Feature) => this.getDefaultStyle(feature)) as StyleLike);

    const feature = new RedliningFeature(olFeature);
    this.state.redlining.features.push(feature);
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
      this.listenOpenLayersEvents();
    });
  }

  onPrintStateChanged() {
    if (this.state.print.format) {
      this.maskLayer.updateSize(this.state.print.format!);
    }
    if (this.state.print.scale) {
      this.maskLayer.updateScale(this.state.print.scale!);
    }
    this.map.updateSize();
  }

  onPrintPanelToggled(visible: boolean) {
    if (visible) {
      this.maskLayer.setMap(this.map);
    }
    else {
      this.maskLayer.setMap(null);
    }
  }

  onCustomGirafeEvent(details: {action: string, layer: Layer, extent: Extent}) {
    if (details.action === GeoEvents.zoomToExtent) {
      this.zoomToExtent(details.extent);
    }
    else if (details.action === GeoEvents.undoDraw) {
      this.draw!.removeLastPoint();
    }
  }

  onSwipedLayersChanged(swipedLayers: { left: Layer[]; right: Layer[]; }) {
    if (swipedLayers.left.length === 0 && swipedLayers.right.length === 0) {
      // TODO REG: Better manage WMS in order to combine swiped layers again in a unique olayer 
      // (to minimize the amount of WMS queries that are sent to the server)
      this.swipeManager.deactivateSwipe();
    }
    else {
      this.swipeLayersOnSide(swipedLayers.left, 'left');
      this.swipeLayersOnSide(swipedLayers.right, 'right');
    }
  }

  swipeLayersOnSide(layers: Layer[], side: 'left' | 'right') {
    for (let i=0; i<layers.length; ++i) {
      const layer = layers[i];
      if (layer instanceof LayerWms) {
        this.swipeManager.activateSwipeForWms(layer, side);
      }
      else if (layer instanceof LayerWmts) {
        this.swipeManager.activateSwipeForWmts(layer, side);
      }
    }
  }

  async create3dMap() {
    if (!this.map3d) {
      // First : Lazy loading of cesium
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'lib/cesium/Cesium.js';
  
        script.onload = resolve;
        script.onerror = reject;
  
        document.body.appendChild(script);
      }).catch((error) => {
        console.error('Error while loading Cesium', error);
      });

      // Initialize the 3D Map
      this.map3d = new OLCesium({ map: this.map, target: this.map3dTarget });
      const scene = this.map3d.getCesiumScene();

      // Add terrain
      const terrainProvider = await CesiumTerrainProvider.fromUrl(this.configManager.Config.map3d!.terrainUrl);
      scene.terrainProvider = terrainProvider;

      // Add 3D-Tiles layer
      const tileset = await Cesium3DTileset.fromUrl(this.configManager.Config.map3d!.tilesetUrl);
      scene.primitives.add(tileset);
    }
  }

  async onGlobeToggled() {
    if (this.state.globe.display === 'full') {
      // Full screen globe has been enabled
      await this.create3dMap();
      this.mapTarget.style.display = 'none';
      this.map3dTarget.style.display = 'block';
      this.map3dTarget.style.left = '0';
      this.map3dTarget.style.width = '100%';
      this.map3d.setEnabled(true);
    }
    else if (this.state.globe.display === 'side') {
      // Side by side has been enabled
      await this.create3dMap();
      this.mapTarget.style.display = 'block';
      this.mapTarget.style.width = '60%';
      this.map3dTarget.style.display = 'block';
      this.map3dTarget.style.left = '55%';
      this.map3dTarget.style.width = '45%';
      this.map3d.setEnabled(true);
    }
    else {
      // 3d map is not visible
      if (this.map3d) {
        this.map3d.setEnabled(false);
      }
      this.mapTarget.style.display = 'block';
      this.mapTarget.style.width = '100%';
      this.map3dTarget.style.display = 'none';
    }
  }

  onFeaturesSelected(features: Feature[]) {
    this.selectedFeaturesCollection.clear();
    if (features) {
      for (let i = 0; i < features.length; ++i) {
        this.selectedFeaturesCollection.push(features[i]);
      }
    }
  }

  onFeatureFocused(feature: Feature) {
    this.focusedFeaturesCollection.clear();
    this.focusedFeaturesCollection.push(feature);
  }

  onChangeScale(scale: number) {
    this.viewManager.setScale(scale);
  }

  zoomToResolution(resolution:number) {
    this.viewManager.setResolution(resolution);
  }

  zoomToExtent(extent: Extent) {
    this.map.getView().fit(extent);
  }

  panToCoordinate(coordinate: Coordinate) {
    this.viewManager.setCenter(coordinate);
  }

  onChangeProjection(srid: string) {
    if (this.srid === srid) {
      // Everything is already ok.
      // => Nothing to do
      return;
    }

    this.srid = srid;
    // TODO REG : update srid in all manager?
    const newView = this.viewManager.getViewFromSrid(srid);
    this.map.setView(newView);
  }

  onChangeDarkMode() {
    const canvas = this.shadow.querySelector('canvas');
    if (canvas) {
      canvas.style.filter = this.state.interface.darkMode ? 'invert(100%) hue-rotate(180deg)' : '';
    }
  }

  onLayerToggled(layer: Layer) {
    if (layer instanceof Layer) {
      if (layer.active) {
        this.onAddLayers([layer]);
      }
      else {
        this.onRemoveLayers([layer]);
      }
    }
  }

  onAddLayers(layerInfos: Layer[]) {
    layerInfos.forEach((l) => {
      if (l instanceof LayerWms) {
        this.wmsManager.addLayer(l);
      }
      else if (l instanceof LayerWmts) {
        this.wmtsManager.addLayer(l);
      }
    });
  }

  onRemoveLayers(layerInfos: Layer[]) {
    layerInfos.forEach((l) => {
      if (l instanceof LayerWms) {
        this.wmsManager.removeLayer(l);
      }
      else if (l instanceof LayerWmts) {
        if (this.wmtsManager.layerExists(l)) {
          this.wmtsManager.removeLayer(l);
        }
      }
    });
  }

  onChangeOrder(_layers: Layer[]) {
    alert('Not Implemented yet');
    // TODO REG : Rewrite this while taking avery layer type in account.
    /*this.wmsManager.changeOrder(layers);
    layers.forEach(layerInfos => {
      if (layerInfos.serverUniqueQueryId in this.layersByServer) {
        const layerDef = this.layersByServer[layerInfos.serverUniqueQueryId];
        const source = this.createImageWMSSource(layerInfos.url, layerDef.layerList, layerInfos.imageType);
        layerDef.layer.setSource(source);
      }
      else if (layerInfos.name in this.independantLayers) {
        // TODO REG: Here we have to change to order of the layers around the transparent layer.
        // This case can be a bit complicated, because the transparent layer can be between non transparent layers
        // Perhaps we will have to split the non-transparent layers in 2 different lists ?
        // Do we really want this ? It sound a bit too much... and can be complicated to implement.
      }
      // TODO REG : Manager swiped layers here
      else if (layerInfos.name in this.swipedLayers) {
        throw new Error(''This case is not supported yet');
      }
    });*/
  }

  onChangeOpacity(layerInfos: Layer) {
    if (layerInfos instanceof LayerWms) {
      this.wmsManager.changeOpacity(layerInfos);
    }
    else if (layerInfos instanceof LayerWmts) {
      if (this.wmtsManager.layerExists(layerInfos)) {
        this.wmtsManager.changeOpacity(layerInfos, layerInfos.opacity);
      }
    }
  }

  onChangeBasemap(basemap: Basemap) {
    // First, remove all existing basemaps
    this.wmtsManager.removeAllBasemapLayers();
    this.wmsManager.removeAllBasemapLayers();
    this.osmManager.removeAllBasemapLayers();
    this.vectorTilesManager.removeAllBasemapLayers();

    // Then, add the selected basemaps
    basemap.layersList.forEach((layer) => {
      if (layer instanceof LayerOsm) {
        this.osmManager.addBasemapLayer();
      }
      else if (layer instanceof LayerVectorTiles) {
        this.vectorTilesManager.addBasemapLayer(layer);
      }
      else if (layer instanceof LayerWmts) {
        this.wmtsManager.addBasemapLayer(layer);
      }
      else if (layer instanceof LayerWms) {
        this.wmsManager.addBasemapLayer(layer);
      }
      else {
        throw new Error('Unknown basemap type');
      }
    });
  }

  /*activatePrintMask(format) {
    this.map.addLayer(this.maskLayer);
  }

  deactivatePrintMask() {
    this.map.removeLayer(this.maskLayer);
  }*/

  onFeaturesChanged(oldFeatures: RedliningFeature[], newFeatures: RedliningFeature[]) {
    let deletedFeatures: RedliningFeature[] = [];
    let addedFeatures: RedliningFeature[] = [];
    if (Array.isArray(newFeatures) && Array.isArray(oldFeatures)) {
      // We received a list of features
      deletedFeatures = oldFeatures.filter(oldFeature => !newFeatures.find(newFeature => newFeature.olFeature.getId() === oldFeature.olFeature.getId()));
      addedFeatures = newFeatures.filter(newFeature => !oldFeatures.find(oldFeature => oldFeature.olFeature.getId() === newFeature.olFeature.getId()));
    }
    else {
      if (!this.isNullOrUndefined(oldFeatures)) {
        deletedFeatures.push(...oldFeatures);
      }
      if (!this.isNullOrUndefined(newFeatures)) {
        addedFeatures.push(...newFeatures);
      }
    }

    deletedFeatures.forEach(feature => {
      this.deleteFeature(feature.olFeature);
    });

    addedFeatures.forEach(feature => {
      this.addFeature(feature.olFeature);
    });
  }

  deleteFeature(feature: Feature) {
    const toRemove = this.redliningFeaturesCollection.getArray().find(f => f.getId() === feature.getId());
    if (!this.isNullOrUndefined(toRemove)) {
      this.redliningFeaturesCollection.remove(toRemove!);
    }
  }

  addFeature(_feature: Feature) {
    // TODO REG : This has to be corretly implemented if we want to add object from state
    // But at the moment only drawing in OpenLayer is supported
    //this.redliningFeaturesCollection.push(feature);
  }

  onRedliningToolChanged(tool: string | null) {
    if (tool === null) {
      this.deactivateRedliningTool();
    }
    else {
      this.activateRedliningTool(tool);
    }
  }

  activateRedliningTool(tool: string) {
    // First remove existing interaction.
    this.deactivateRedliningTool();

    let geometryFunction = undefined;
    let freehand = false;
    if (tool === 'Square') {
      tool = 'Circle';
      geometryFunction = createRegularPolygon(4);
    }
    else if (tool === 'Rectangle') {
      tool = 'Circle';
      geometryFunction = createBox();
    }
    else if (tool === 'Freeline') {
      tool = 'LineString';
      freehand = true;
    }
    else if (tool === 'Freepolygon') {
      tool = 'Polygon';
      freehand = true;
    }

    this.draw = new Draw({
      source: this.redliningSource,
      type: tool as Type,
      freehand: freehand,
      geometryFunction: geometryFunction
    });
    const modify = new Modify({ source: this.redliningSource });
    this.map.addInteraction(modify);

    this.map.addInteraction(this.draw);
    this.snap = new Snap({ source: this.redliningSource });
    this.map.addInteraction(this.snap);
  }

  deactivateRedliningTool() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    if (this.snap) {
      this.map.removeInteraction(this.snap);
    }
  }

  getRandomInt(min: number, max: number) {
    // The maximum is exclusive and the minimum is inclusive
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }
}

customElements.define('girafe-map', MapComponent);

export default MapComponent;
