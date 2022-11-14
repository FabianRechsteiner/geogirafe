import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import Collection from 'ol/Collection';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Circle from 'ol/style/Circle';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { Modify, Snap, DragBox } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import Draw, { createBox, createRegularPolygon } from 'ol/interaction/Draw';
import View from 'ol/View';
import GeoEvents from '/models/events.js';
import { getPointResolution, get as getProjection, transform } from 'ol/proj';
import { Image as ImageLayer } from 'ol/layer';
import ImageWMS from 'ol/source/ImageWMS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import GirafeHTMLElement from '/base/GirafeHTMLElement';
import adjectives from 'adjectives';
import {getVectorContext} from 'ol/render';
import {easeOut} from 'ol/easing';
import {unByKey} from 'ol/Observable';

class MapComponent extends GirafeHTMLElement {

  static #template = null;

  map = null;

  srid = 'EPSG:3857'; // default projection
  get projection() {
    return getProjection(this.srid);
  }

  // For Basemaps
  currentBasemap = null;

  // For WMS Layers
  layersByServer = {};
  transparentLayers = {};

  // For WMTS Layers
  wmtsCapabilitiesByServer = {};
  wmtsLayers = {};

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

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.registerEvents();
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
    window.addEventListener(GeoEvents.Redlining, (e) => this.onRedliningEvent(e.detail));
  }

  async loadTemplate() {
    if (MapComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/map/template.html');
    const content = await response.text();
    MapComponent.#template = document.createElement('template');
    MapComponent.#template.innerHTML = content;
  }

  render() {

    // Clone component template and add it to the dom
    this.shadow.appendChild(MapComponent.#template.content.cloneNode(true));

    this.srid = this.getAttribute('srid');
    const defaultextent = this.getAttribute('max-extent').split(',').map(Number);
    const startcenter = this.getAttribute('center').split(',').map(Number);
    const startzoom = Number(this.getAttribute('zoom'));

    // Default basemap : OSM
    this.currentBasemap = new TileLayer({
      source: new OSM()
    });

    // Create map element
    let target = this.shadow.querySelector('#ol-map-container');
    this.map = new Map({
      target: target,
      layers: [this.currentBasemap],
      view: new View({
        center: startcenter,
        zoom: startzoom,
        projection: this.srid,
        extent: defaultextent
      }),
    });

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
        stroke: new Stroke({ color: this.defaultStrokeColor, width: this.defaultStrokeWidth*2 }),
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

    this.messageManager.sendMessage(GeoEvents.Map, {action: 'projectionChanged', projection: this.srid});

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
    //this.map.on('loadend', (e) => console.log(e));
    //this.map.on('loadstart', (e) => console.log(e));
    this.map.on('moveend', (e) => this.onMoveEnd(e));
    //this.map.on('movestart', (e) => console.log(e));
    //this.map.on('pointerdrag', (e) => console.log(e));
    //this.map.on('pointermove', (e) => console.log(e));
    //this.map.on('postcompose', (e) => console.log(e));
    //this.map.on('postrender', (e) => console.log(e));
    //this.map.on('precompose', (e) => console.log(e));
    //this.map.on('propertychange', (e) => console.log(e));
    //this.map.on('rendercomplete', (e) => console.log(e));
    //? change:layerGroup
    //? change:size
    //? change:target
    //? change:view

    // Drawing events
    this.redliningFeaturesCollection.on('add', (e) => this.onFeatureAdded(this, e));

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
      const queryLayers = this.layersByServer[key].queryableList.map(l => l.queryLayers.split(',')).flat(1);

      // Build selectionbox using the default tolerance
      const topLeftPixel = [e.pixel[0] - this.pixelTolerance, e.pixel[1] - this.pixelTolerance];
      const topLeftCoord = this.map.getCoordinateFromPixel(topLeftPixel);
      const bottomRightPixel = [e.pixel[0] + this.pixelTolerance, e.pixel[1] + this.pixelTolerance];
      const bottomRightCoord = this.map.getCoordinateFromPixel(bottomRightPixel);
      const extent = [topLeftCoord[0], topLeftCoord[1], bottomRightCoord[0], bottomRightCoord[1]];

      // TODO REG: Use the right WFS URL
      selectionParams.push({
        wfsUrl: 'https://wfs.geo.bs.ch',
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
      const queryLayers = this.layersByServer[key].queryableList.map(l => l.queryLayers.split(',')).flat(1);

      // TODO REG: Use the right WFS URL
      selectionParams.push({
        wfsUrl: 'https://wfs.geo.bs.ch',
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
      this.listenOpenLayersEvents();
      this.initialized();
    });
  }

  initialized() {
    this.messageManager.sendMessage(GeoEvents.Init, { action: 'componentInitialized' });
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
      if (details.state.basemap !== 'null') {
        this.onChangeBasemap(details.state.basemap);
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
    if (details.action === 'projectionChanged') {
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
  }

  onClearSelection() {
    this.selectedFeaturesCollection.clear();
  }

  onFeaturesSelected(features) {
    for (let i=0; i<features.length; ++i) {
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
  }

  onAddLayers(layerInfos) {
    layerInfos.forEach((l) => {
      if (l.isWms) {
        this.onAddWmsLayer(l);
      }
      else if (l.isWmts) {
        this.onAddWmtsLayer(l);
      }
    });
  }

  onRemoveLayers(layerInfos) {
    layerInfos.forEach((l) => {
      if (l.isWms) {
        this.onRemoveWmsLayer(l);
      }
      else if (l.isWmts) {
        this.onRemoveWmtsLayer(l);
      }
    });
  }

  onChangeOrder(layers) {
    layers.forEach(layerInfos => {
      if (layerInfos.serverUniqueQueryId in this.layersByServer) {
        const layerDef = this.layersByServer[layerInfos.serverUniqueQueryId];
        const source = this.createImageWMSSource(layerInfos.url, layerDef.layerList, layerInfos.imageType);
        layerDef.layer.setSource(source);
      }
      else if (layerInfos.name in this.transparentLayers) {
        // TODO REG: Here we have to change to order of the layers around the transparent layer.
        // This case can be a bit complicated, because the transparent layer can be between non transparent layers
        // Perhaps we will have to split the non-transparent layers in 2 different lists ?
        // Do we really want this ? It sound a bit too much... and can be complicated to implement.
      }
    });
  }

  onAddWmsLayer(layerInfos) {
    if (layerInfos.serverUniqueQueryId in this.layersByServer) {
      // Get existing ol layer for this server
      // and add a new wms layer in the source
      const layerDef = this.layersByServer[layerInfos.serverUniqueQueryId];
      layerDef.layerList.push(layerInfos);
      if (layerInfos.queryable) {
        layerDef.queryableList.push(layerInfos);
      }
      const source = this.createImageWMSSource(layerInfos.url, layerDef.layerList, layerInfos.imageType);
      layerDef.layer.setSource(source);
    }
    else {
      // Create a new ol layer
      const layer = new ImageLayer();
      const layerDef = { layer: layer, layerList: [layerInfos], queryableList: [] };
      if (layerInfos.queryable) {
        layerDef.queryableList.push(layerInfos);
      }
      this.layersByServer[layerInfos.serverUniqueQueryId] = layerDef;
      const source = this.createImageWMSSource(layerInfos.url, layerDef.layerList, layerInfos.imageType);
      layer.setSource(source);
      this.map.addLayer(layer);
    }

    // If the layer is transparent, we make it transparent
    if (layerInfos.isTransparent) {
      this.onChangeOpacity(layerInfos);
    }
  }

  onAddWmtsLayer(layerInfos) {
    this.getWmtsCapabilities(layerInfos.url, (capabilities) => {
      const options = optionsFromCapabilities(capabilities, {
        layer: layerInfos.name,
        matrixSet: this.srid,
      });

      const layer = new TileLayer({
        opacity: layerInfos.opacity,
        source: new WMTS(options),
      });

      this.wmtsLayers[layerInfos.name] = layer;
      this.map.addLayer(layer);
    });
  }

  createImageWMSSource(url, layerList, imageType) {
    const orderedLayerNames = layerList.sort((l1, l2) => { return l2.order - l1.order }).map(l => l.layers);
    const source = new ImageWMS({
      url: url,
      params: {
        'LAYERS': orderedLayerNames,
        'FORMAT': imageType
      }
    });
    return source;
  }

  onRemoveWmsLayer(layerInfos) {
    if (layerInfos.name in this.transparentLayers) {
      const layerDef = this.transparentLayers[layerInfos.name];
      delete this.transparentLayers[layerInfos.name];
      this.map.removeLayer(layerDef);
    }
    else if (layerInfos.serverUniqueQueryId in this.layersByServer) {
      // Get existing ol layer for this server
      // and add a new wms layer in the source
      const layerDef = this.layersByServer[layerInfos.serverUniqueQueryId];
      layerDef.layerList = layerDef.layerList.filter(item => item.id !== layerInfos.id);

      if (layerDef.layerList.length > 0) {
        // There are still layers in the list.
        // => We update the layer source
        const source = this.createImageWMSSource(layerInfos.url, layerDef.layerList, layerInfos.imageType);
        layerDef.layer.setSource(source);
      }
      else {
        // No more layer here.
        // => We simply remove the whole layer
        delete this.layersByServer[layerInfos.serverUniqueQueryId];
        this.map.removeLayer(layerDef.layer);
      }
    }
    else {
      console.log('Nothing to remove !');
    }
  }

  onRemoveWmtsLayer(layerInfos) {
    if (layerInfos.name in this.wmtsLayers) {
      const layerDef = this.wmtsLayers[layerInfos.name];
      delete this.wmtsLayers[layerInfos.name];
      this.map.removeLayer(layerDef);
    }
  }

  onChangeOpacity(layerInfos) {
    if (layerInfos.isWms) {
      this.changeWmsOpacity(layerInfos);
    }
    else if (layerInfos.isWmts) {
      this.changeWmtsOpacity(layerInfos);
    }
  }

  changeWmtsOpacity(layerInfos) {
    if (layerInfos.name in this.wmtsLayers) {
      const layerDef = this.wmtsLayers[layerInfos.name];
      layerDef.setOpacity(layerInfos.opacity);
    }
    else {
      // Nothing to do.
      console.log('Nothing to do here');
    }
  }

  changeWmsOpacity(layerInfos) {
    if (!layerInfos.isTransparent) {
      // Back to normal
      // The opacity was set to 1 again.
      if (layerInfos.name in this.transparentLayers) {
        const layerDef = this.transparentLayers[layerInfos.name];
        // We delete the layer from the transparent layers
        delete this.transparentLayers[layerInfos.name];
        this.map.removeLayer(layerDef);
        // And add it to the normal layer again
        this.onAddWmsLayer(layerInfos);
      }
      else {
        // Nothing to do.
        console.log('Nothing to do here');
      }
    }
    else if (layerInfos.name in this.transparentLayers) {
      // The layer has already a configured opacity
      // => We just change the opacity
      const layerDef = this.transparentLayers[layerInfos.name];
      layerDef.setOpacity(layerInfos.opacity);
    }
    else if (layerInfos.serverUniqueQueryId in this.layersByServer) {
      // First, we remove the layer from the default layer
      this.onRemoveWmsLayer(layerInfos);
      // Then, we create a new layer
      const source = this.createImageWMSSource(layerInfos.url, [layerInfos], layerInfos.imageType);
      const layer = new ImageLayer({
        source: source,
        opacity: layerInfos.opacity
      });
      this.transparentLayers[layerInfos.name] = layer;
      this.map.addLayer(layer);
    }
    else {
      // Nothing to do
      console.log('Nothing to do!');
    }
  }

  onChangeBasemap(basemap) {
    // TODO REG : Use constant
    if (basemap.type === 'WMTS') {
      this.getWmtsCapabilities(basemap.url, (capabilities) => {
        const options = optionsFromCapabilities(capabilities, {
          layer: basemap.name,
          matrixSet: this.srid,
        });

        const layer = new TileLayer({
          opacity: 1,
          source: new WMTS(options),
        });

        this.map.removeLayer(this.currentBasemap)
        // Always insert in the background
        this.map.getLayers().insertAt(0, layer);
        this.currentBasemap = layer;
      });
    }
    else if (basemap.type === 'OSM') {
      // Create OSM layer
      this.map.removeLayer(this.currentBasemap)
      this.currentBasemap = new TileLayer({
        source: new OSM()
      });
      // Always insert in the background
      this.map.getLayers().insertAt(0, this.currentBasemap);
    }
  }

  getWmtsCapabilities(url, callback) {
    if (url in this.wmtsCapabilitiesByServer) {
      // Capabilities were already loaded
      const capabilities = this.wmtsCapabilitiesByServer[url];
      callback(capabilities);
    }
    else {
      // Capabilities were not loaded yet.
      fetch(url)
        .then(response => response.text())
        .then(capabilities => {
          // Create new WMTS Layer from Capabilities
          const parser = new WMTSCapabilities();
          const result = parser.read(capabilities);
          this.wmtsCapabilitiesByServer[url] = result;

          callback(result);
        });
    }
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
