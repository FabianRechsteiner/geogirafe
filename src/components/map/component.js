import Map from 'ol/Map';

import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import ImageWMS from 'ol/source/ImageWMS';

import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Circle from 'ol/style/Circle';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile.js';

import Collection from 'ol/Collection';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { Modify, Snap, DragBox } from 'ol/interaction';
import Draw, { createBox, createRegularPolygon } from 'ol/interaction/Draw';
import View from 'ol/View';
import { getPointResolution, get as getProjection, transform } from 'ol/proj';
import adjectives from 'adjectives';
import { getVectorContext } from 'ol/render';
import { easeOut } from 'ol/easing';
import { unByKey } from 'ol/Observable';
import OLCesium from 'olcs/OLCesium.js';
import { applyStyle } from 'ol-mapbox-style';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import GeoEvents from '../../models/events.js';

import MaskLayer from './tools/maskLayer';
import SwipeManager from './tools/swipemanager';
import WmsManager from './tools/wmsmanager';
import WmtsManager from './tools/wmtsmanager';
import GeoConfig from '../../config';

class MapComponent extends GirafeHTMLElement {

  map = null;
  map3d = null;
  swiper = null;
  swiperManager = null;
  wmtsManager = null;
  wmsManager = null;

  srid = null;
  get projection() {
    return getProjection(this.srid);
  }

  // For Redlining
  redliningFeaturesCollection = new Collection();
  redliningSource = null;
  redliningLayer = null;
  draw = null;
  snap = null;

  // Default styles
  defaultStrokeColor = '#ff0000';
  defaultStrokeWidth = 2;
  defaultFillColor = '#ff66667f';
  defaultTextSize = 12;
  defaultFont = 'Arial';

  // For object selection
  selectedFeaturesCollection = new Collection();
  focusedFeaturesCollection = new Collection();
  selectionLayer = null;
  focusLayer = null;
  focusAnimation = null;
  pixelTolerance = 10;
  dragbox = null;

  // For print
  maskLayer = new MaskLayer({ name: 'PrintMask' });

  constructor() {
    super('map');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
    window.addEventListener(GeoEvents.Redlining, (e) => this.onRedliningEvent(e.detail));
    window.addEventListener(GeoEvents.Print, (e) => this.onPrintEvent(e.detail));

    this.swiper.addEventListener('input', () => this.map.render());
  }

  render() {
    super.render();

    this.srid = GeoConfig.map.srid;
    const defaultextent = GeoConfig.map.maxExtent.split(',').map(Number);
    const startcenter = GeoConfig.map.startPosition.split(',').map(Number);
    const startzoom = Number(GeoConfig.map.startZoom);

    // Default basemap : OSM
    const basemapLayer = new TileLayer({
      source: new OSM()
    });

    // Create map element
    let target = this.shadow.querySelector('#ol-map-container');
    this.map = new Map({
      target: target,
      layers: [basemapLayer],
      view: new View({
        center: startcenter,
        zoom: startzoom,
        projection: this.srid,
        extent: defaultextent
      }),
    });

    // Initialize managers
    this.wmsManager = new WmsManager(this.map, this.srid);
    this.wmtsManager = new WmtsManager(this.map, this.srid);
    this.swiper = this.shadow.getElementById('swiper');
    this.swipeManager = new SwipeManager(this.map, this.swiper, this.wmtsManager, this.wmsManager);

    // Create vector source for drawing
    this.redliningSource = new VectorSource({
      features: this.redliningFeaturesCollection
    });
    this.redliningLayer = new VectorLayer({
      source: this.redliningSource,
      //style: (feature) => this.getDefaultStyle(this, feature)
    });
    this.map.addLayer(this.redliningLayer);
    this.redliningLayer.setZIndex(1001);

    // Create layer for selection
    const selectionSource = new VectorSource({
      features: this.selectedFeaturesCollection
    });
    this.selectionLayer = new VectorLayer({
      source: selectionSource,
      // TODO REG: Change default selection color
      style: new Style({
        stroke: new Stroke({ color: this.defaultStrokeColor, width: this.defaultStrokeWidth * 2 }),
        fill: new Fill({ color: this.defaultFillColor }),
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: this.defaultFillColor }),
          stroke: new Stroke({ color: this.defaultStrokeColor, width: this.defaultStrokeWidth })
        })
      })
    });
    this.map.addLayer(this.selectionLayer);
    this.selectionLayer.setZIndex(1002);

    // Create layer for focus
    const focusSource = new VectorSource({
      features: this.focusedFeaturesCollection
    });
    focusSource.on('addfeature', (e) => { this.flash(e.feature) });
    this.focusLayer = new VectorLayer({
      source: selectionSource,
      // TODO REG: Change default focus color
      style: new Style({
        stroke: new Stroke({ color: this.defaultStrokeColor, width: this.defaultStrokeWidth }),
        fill: new Fill({ color: this.defaultFillColor }),
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: this.defaultFillColor }),
          stroke: new Stroke({ color: this.defaultStrokeColor, width: this.defaultStrokeWidth })
        })
      })
    });
    this.map.addLayer(this.focusLayer);
    this.focusLayer.setZIndex(1003);

    // Add drabos selection interaction
    this.dragbox = new DragBox({
      condition: platformModifierKeyOnly,
    });
    this.map.addInteraction(this.dragbox);
    this.dragbox.on('boxend', (e) => this.onDragSelection(e));

    this.messageManager.sendMessage(GeoEvents.Map, { action: 'projectionChanged', projection: this.srid });

    // TODO REG: This is ugly, but I didn't find any other solution yet.
    setTimeout(() => {
      this.map.updateSize();
    }, 1000);
  }

  getDefaultStyle(feature) {

    const strokeColor = (feature.get('strokeColor')) ? feature.get('strokeColor') : this.defaultStrokeColor;
    const strokeWidth = (feature.get('strokeWidth')) ? feature.get('strokeWidth') : this.defaultStrokeWidth;
    const fillColor = (feature.get('fillColor')) ? feature.get('fillColor') : this.defaultFillColor;
    const textSize = (feature.get('textSize')) ? feature.get('textSize') : this.defaultTextSize;

    return new Style({
      stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
      fill: new Fill({ color: fillColor }),
      image: new Circle({
        radius: 7,
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: strokeColor, width: strokeWidth })
      }),
      text: new Text({ text: feature.get('name'), font: 'Bold ' + textSize + 'px/1 ' + this.defaultFont })
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
    //this.map.on('pointermove', (e) => console.log(e));
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
    this.redliningFeaturesCollection.on('add', (e) => this.onFeatureAdded(this, e));
  }

  onLoadStart(e) {
    this.messageManager.sendMessage(GeoEvents.Map, { action: 'renderStarted' });
  }

  onLoadEnd(e) {
    this.messageManager.sendMessage(GeoEvents.Map, { action: 'renderEnded' });
  }

  onMoveEnd(e) {
    const view = this.map.getView();
    const center = view.getCenter();
    const mapX = center[0];
    const mapY = center[1];
    const mapZ = view.getZoom();
    const resolution = view.getResolution();
    this.messageManager.sendMessage(GeoEvents.Map, { action: 'coordsChanged', mapX: mapX, mapY: mapY, mapZ: mapZ });
    this.messageManager.sendMessage(GeoEvents.Map, { action: 'resolutionChanged', resolution: resolution });
  }

  onClick(e) {
    const selectionParams = [];

    for (let key in this.layersByServer) {
      const layer = this.layersByServer[key];
      const queryLayers = layer.queryableList.map(l => l.queryLayers.split(',')).flat(1);

      // Build selectionbox using the default tolerance
      const topLeftPixel = [e.pixel[0] - this.pixelTolerance, e.pixel[1] - this.pixelTolerance];
      const topLeftCoord = this.map.getCoordinateFromPixel(topLeftPixel);
      const bottomRightPixel = [e.pixel[0] + this.pixelTolerance, e.pixel[1] + this.pixelTolerance];
      const bottomRightCoord = this.map.getCoordinateFromPixel(bottomRightPixel);
      const extent = [topLeftCoord[0], topLeftCoord[1], bottomRightCoord[0], bottomRightCoord[1]];

      // TODO REG: Use the right WFS URL
      selectionParams.push({
        wfsUrl: layer.urlWfs,
        selectionBox: extent,
        srid: this.srid,
        featureTypes: queryLayers
      });
    }

    this.messageManager.sendMessage(GeoEvents.Map, { action: 'selectFeatures', selectionParams: selectionParams });
  }

  onDragSelection(e) {
    const extent = this.dragbox.getGeometry().getExtent();
    const selectionParams = [];

    for (let key in this.layersByServer) {
      const layer = this.layersByServer[key];
      const queryLayers = layer.queryableList.map(l => l.queryLayers.split(',')).flat(1);

      // TODO REG: Use the right WFS URL
      selectionParams.push({
        wfsUrl: layer.urlWfs,
        selectionBox: extent,
        srid: this.srid,
        featureTypes: queryLayers
      });
    }

    this.messageManager.sendMessage(GeoEvents.Map, { action: 'selectFeatures', selectionParams: selectionParams });
  }

  flash(feature) {
    const duration = 2000;
    var startStart = Date.now();
    var start = startStart;
    const flashGeom = feature.getGeometry().clone();
    // First deactivate the current animation
    // (We only want one animated object)
    if (this.focusAnimation !== null) {
      unByKey(this.focusAnimation);
    }
    this.focusAnimation = this.selectionLayer.on('postrender', (e) => animate(this, e));

    function animate(_this, e) {
      const frameState = e.frameState;
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

  onFeatureAdded(_this, e) {
    // Set the default feature name
    const name = adjectives[_this.getRandomInt(0, adjectives.length)] + ' ' + e.element.getGeometry().getType();
    e.element.set('name', name);
    // Add default style as a function, because we want the attributes (for example the name) to be evaluated on display time
    e.element.setStyle((feature) => this.getDefaultStyle(feature));
    // Send message
    this.messageManager.sendMessage(GeoEvents.Redlining, {
      action: 'featureAdded',
      id: e.element.ol_uid,
      name: name,
      strokeColor: this.defaultStrokeColor,
      fillColor: this.defaultFillColor,
      strokeWidth: this.defaultStrokeWidth
    });
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
      this.listenOpenLayersEvents();
      super.initialized();
    });
  }

  attributeChangedCallback(name, oldValue, newValue, namespace) {
    console.log('attributeChangedCallback');
  }

  onTreeViewEvent(details) {
    if (details.action === 'layerEnabled') {
      this.onAddLayers([details.layer]);
    }
    else if (details.action === 'layerDisabled') {
      this.onRemoveLayers([details.layer]);
    }
    if (details.action === 'layerListEnabled') {
      this.onAddLayers(details.layerList);
    }
    else if (details.action === 'layerListDisabled') {
      this.onRemoveLayers(details.layerList);
    }
    else if (details.action === 'requestLegendUrl') {
      this.onLegendUrlRequested(details.layer);
    }
  }

  // TODO REG : move this function to wmsmanager
  onLegendUrlRequested(layer) {
    const wmsSource = new ImageWMS({
      url: layer.url,
      params: { 'LAYERS': layer.layers },
      ratio: 1
    });

    let graphicUrl = wmsSource.getLegendUrl(this.map.getView().getResolution());
    if (!graphicUrl.toLowerCase().includes('sld_version')) {
      // Add SLD_Version (it is mandatory, but openlayers do not seems to set it in the URL)
      graphicUrl += '&SLD_Version=1.1.0'
    }
    if (!this.isNullOrUndefined(layer.legendRule)) {
      graphicUrl += '&RULE=' + encodeURIComponent(layer.legendRule);
    }

    this.messageManager.sendMessage(GeoEvents.TreeView, { action: 'responseLegendUrl', id: layer.legendId, url: graphicUrl });
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      console.log('Initializing Map from state...')
      if (details.state.projection !== 'null') {
        this.onChangeProjection(details.state.projection);
      }
      if (details.state.mapX !== 'null' && details.state.mapY !== 'null' && details.state.mapZ !== 'null') {
        const newView = new View({
          center: [parseFloat(details.state.mapX), parseFloat(details.state.mapY)],
          zoom: parseFloat(details.state.mapZ),
          projection: this.projection,
          extent: this.map.getView().get('extent')
        });
        this.map.setView(newView);
      }
    }
  }

  onMapEvent(details) {
    if (details.action === 'changeProjection') {
      this.onChangeProjection(details.projection);
    }
    else if (details.action === 'basemapChanged') {
      this.onChangeBasemap(details.basemap);
    }
    else if (details.action === 'zoomToResolution') {
      this.zoomToResolution(details.resolution);
    }
    else if (details.action === 'zoomToExtent') {
      this.zoomToExtent(details.extent);
    }
    else if (details.action === 'panToCoordinate') {
      this.panToCoordinate(details.coordinate);
    }
    else if (details.action === 'opacityChanged') {
      this.onChangeOpacity(details.layer);
    }
    else if (details.action === 'orderChanged') {
      this.onChangeOrder(details.layers);
    }
    else if (details.action === 'clearSelection') {
      this.onClearSelection();
    }
    else if (details.action === 'featuresSelected') {
      this.onFeaturesSelected(details.features);
    }
    else if (details.action === 'featureFocused') {
      this.onFeatureFocused(details.feature);
    }
    else if (details.action === 'globeToggled') {
      this.onGlobeToggled();
    }
    else if (details.action === 'activateSwipe') {
      this.onActivateSwipe(details.layer, details.side);
    }
  }

  onActivateSwipe(layerInfos, side) {
    if (layerInfos.isWms) {
      this.swipeManager.activateSwipeForWms(layerInfos, side);
    }
    else if (layerInfos.isWmts) {
      this.swipeManager.activateSwipeForWmts(layerInfos.name, side, layerInfos.opacity);
    }
  }

  onGlobeToggled() {
    if (this.map3d === null || !this.map3d.getEnabled()) {
      // Globe is not active
      this.map3d = new OLCesium({ map: this.map });
      const scene = this.map3d.getCesiumScene();

      // Add terrain
      const terrainProvider = new Cesium.CesiumTerrainProvider({
        url: GeoConfig.map3d.terrainUrl
      });
      scene.terrainProvider = terrainProvider;

      // Add 3D-Tiles layer
      const tileset = new Cesium.Cesium3DTileset({
        url: GeoConfig.map3d.tilesetUrl
      });
      scene.primitives.add(tileset);

      // Activate 3D map
      this.map3d.setEnabled(true);
    }
    else {
      this.map3d.setEnabled(false);
    }
  }

  onClearSelection() {
    this.selectedFeaturesCollection.clear();
  }

  onFeaturesSelected(features) {
    for (let i = 0; i < features.length; ++i) {
      this.selectedFeaturesCollection.push(features[i]);
    }
  }

  onFeatureFocused(feature) {
    this.focusedFeaturesCollection.clear();
    this.focusedFeaturesCollection.push(feature);
  }

  zoomToResolution(resolution) {
    this.map.getView().setResolution(resolution);
  }

  zoomToExtent(extent) {
    this.map.getView().fit(extent);
  }

  panToCoordinate(coordinate) {
    this.map.getView().setCenter(coordinate);
  }

  onChangeProjection(srid) {
    if (this.srid === srid) {
      // Everything is already ok.
      // => Nothing to do
      return;
    }

    this.srid = srid;

    const currentView = this.map.getView();
    const currentProjection = currentView.getProjection();

    // Convert old values...
    const currentResolution = currentView.getResolution();
    const currentCenter = currentView.getCenter();
    const currentRotation = currentView.getRotation();
    const currentExtent = currentView.get('extent');

    // ... to new ones
    const newCenter = transform(currentCenter, currentProjection, this.projection);
    const currentMPU = currentProjection.getMetersPerUnit();
    const newMPU = this.projection.getMetersPerUnit();
    const currentPointResolution = getPointResolution(currentProjection, 1 / currentMPU, currentCenter, 'm') * currentMPU;
    const newPointResolution = getPointResolution(this.projection, 1 / newMPU, newCenter, 'm') * newMPU;
    const newResolution = (currentResolution * currentPointResolution) / newPointResolution;
    const newExtentPoint1 = transform([currentExtent[0], currentExtent[1]], currentProjection, this.projection);
    const newExtentPoint2 = transform([currentExtent[2], currentExtent[3]], currentProjection, this.projection);
    const newExtent = [newExtentPoint1[0], newExtentPoint1[1], newExtentPoint2[0], newExtentPoint2[1]];

    // Create new view
    const newView = new View({
      center: newCenter,
      resolution: newResolution,
      rotation: currentRotation,
      projection: this.projection,
      extent: newExtent
    });
    this.map.setView(newView);

    this.messageManager.sendMessage(GeoEvents.Map, { action: 'projectionChanged', projection: this.srid });
  }

  onAddLayers(layerInfos) {
    layerInfos.forEach((l) => {
      if (l.isWms) {
        this.wmsManager.addLayer(l);
      }
      else if (l.isWmts) {
        this.wmtsManager.addLayer(l.url, l.name, l.opacity);
      }
    });
  }

  onRemoveLayers(layerInfos) {
    layerInfos.forEach((l) => {
      if (l.isWms) {
        this.wmsManager.removeLayer(l);
      }
      else if (l.isWmts) {
        if (this.wmtsManager.layerExists(l.name)) {
          this.wmtsManager.removeLayer(l.name);
        }
      }
    });
  }

  onChangeOrder(layers) {
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
        throw 'This case is not supported yet';
      }
    });*/
  }

  onChangeOpacity(layerInfos) {
    if (layerInfos.isWms) {
      this.wmsManager.changeOpacity(layerInfos);
    }
    else if (layerInfos.isWmts) {
      if (this.wmtsManager.layerExists(layerInfos.name)) {
        this.wmtsManager.changeOpacity(layerInfos.name, layerInfos.opacity);
      }
    }
  }

  onChangeBasemap(basemap) {
    if (basemap.type === 'WMTS') {
      this.wmtsManager.addBasemapLayer(basemap.url, basemap.name);
    }
    else if (basemap.type === 'OSM') {
      // Create OSM layer
      const currentBasemap = this.map.getLayers().getArray()[0];
      this.map.removeLayer(currentBasemap);
      const newBasemap = new TileLayer({
        source: new OSM()
      });
      this.map.getLayers().insertAt(0, newBasemap);
    }
    else if (basemap.type === 'VectorTiles') {
      // Create VectorTiles Layer
      const currentBasemap = this.map.getLayers().getArray()[0];
      this.map.removeLayer(currentBasemap);
      const newBasemap = new VectorTileLayer({ declutter: true });
      applyStyle(newBasemap, basemap.style);
      this.map.getLayers().insertAt(0, newBasemap);
    }
    else {
      throw 'Unknown basemap type: ' + basemap.type;
    }
  }

  onPrintEvent(details) {
    if (details.action === 'printActivated') {
      this.maskLayer.updateSize(details.format);
      this.maskLayer.updateScale(details.scale);
      this.maskLayer.setMap(this.map);
    }
    else if (details.action === 'printDeactivated') {
      this.maskLayer.setMap(null);
    }
    else if (details.action === 'layoutChanged') {
      this.maskLayer.updateSize(details.format);
      this.map.updateSize();
    }
    else if (details.action === 'scaleChanged') {
      this.maskLayer.updateScale(details.scale);
      this.map.updateSize();
    }
  }

  activatePrintMask(format) {
    this.map.addLayer(this.maskLayer);
  }

  deactivatePrintMask() {
    this.map.removeLayer(this.maskLayer);
  }

  onRedliningEvent(details) {
    if (details.action === 'drawToolActivated') {
      this.activateRedliningTool(details.tool);
    }
    else if (details.action === 'drawToolDeactivated') {
      this.deactivateRedliningTool();
    }
    else if (details.action === 'deleteFeature') {
      this.deleteFeature(details.id);
    }
    else if (details.action === 'styleChanging') {
      this.setFeatureStyle(details.id, details.fillColor, details.strokeColor, details.strokeWidth, details.text);
    }
    else if (details.action === 'styleChanged') {
      console.log('styleChanged');
    }
    else if (details.action === 'nameChanging') {
      this.setFeatureName(details.id, details.name);
    }
    else if (details.action === 'undoDraw') {
      this.draw.removeLastPoint();
    }
  }

  setFeatureName(id, name) {
    console.log(id);
    const feature = this.redliningFeaturesCollection.getArray().find(f => f.ol_uid === id);
    console.log('old: ' + feature.get('name'));
    console.log('new: ' + name);
    feature.set('name', name);
  }

  setFeatureStyle(id, fillColor, strokeColor, strokeWidth, text) {
    const feature = this.redliningFeaturesCollection.getArray().find(f => f.ol_uid === id);

    if (fillColor) {
      feature.set('fillColor', fillColor.hex);
    }
    if (strokeColor) {
      feature.set('strokeColor', strokeColor.hex);
    }
    if (strokeWidth) {
      feature.set('strokeWidth', strokeWidth);
    }
    if (text === 'textbigger') {
      console.log(text);
      const textSize = (feature.get('textSize')) ? feature.get('textSize') : this.defaultTextSize;
      feature.set('textSize', textSize + 1);
    }
    if (text === 'textsmaller') {
      console.log(text);
      const textSize = (feature.get('textSize')) ? feature.get('textSize') : this.defaultTextSize;
      feature.set('textSize', textSize - 1);
    }
  }

  deleteFeature(id) {
    const toRemove = this.redliningFeaturesCollection.getArray().find(f => f.ol_uid === id);
    this.redliningFeaturesCollection.remove(toRemove);
    this.messageManager.sendMessage(GeoEvents.Redlining, { action: 'featureRemoved', id: toRemove.ol_uid });
  }

  activateRedliningTool(tool) {
    console.log('Activating Redlining Tool...');
    // First remove existing interaction.
    this.deactivateRedliningTool();

    let geometryFunction = null;
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
      type: tool,
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

  getRandomInt(min, max) {
    // The maximum is exclusive and the minimum is inclusive
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }
}

customElements.define('girafe-map', MapComponent);

export default MapComponent;
