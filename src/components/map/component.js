import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import Collection from 'ol/Collection';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Circle from 'ol/style/Circle';
import WMTS, {optionsFromCapabilities} from 'ol/source/WMTS';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { Modify, Snap } from 'ol/interaction';
import Draw, { createBox, createRegularPolygon } from 'ol/interaction/Draw';
import View from 'ol/View';
import GeoEvents from '/models/events.js';
import { getPointResolution, get as getProjection, transform} from 'ol/proj';
import { Image as ImageLayer } from 'ol/layer';
import ImageWMS from 'ol/source/ImageWMS';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import GirafeHTMLElement from '/base/GirafeHTMLElement';
import adjectives from 'adjectives';

class MapComponent extends GirafeHTMLElement {

  static #template = null;

  map = null;

  srid = 'EPSG:3857'; // default projection
  projection = getProjection(this.srid);
  currentBasemap = null;
  layersByServer = {};

  // For Redlining
  featuresCollection = null;
  vectorSource = null;
  vectorLayer = null;
  draw = null;
  snap = null;
  
  // Default styles
  defaultStrokeColor = '#ff0000';
  defaultStrokeWidth = 2;
  defaultFillColor = '#ff66667f';
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
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

    // Default basemap : OSM
    this.currentBasemap = new TileLayer({
      source: new OSM()
    });

    // Create map element
    let target = this.shadow.querySelector('#ol-map-container');
    this.map = new Map({
      target: target,
      layers: [ this.currentBasemap ],
      view: new View({ 
        center: [0, 0],
        zoom: 2,
      }),
    });

    // Create vector source for drawing
    this.featuresCollection = new Collection();
    this.vectorSource = new VectorSource({
      features: this.featuresCollection
    });
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: (feature) => {
        return new Style({
          stroke: new Stroke({color: this.defaultStrokeColor, width: this.defaultStrokeWidth}),
          fill: new Fill({color: this.defaultFillColor}),
          image: new Circle({
            radius: 7,
            fill: new Fill({color: this.defaultFillColor}),
            stroke: new Stroke({color: this.defaultStrokeColor, width: this.defaultStrokeWidth})
          }),
          text: new Text({text: feature.get('name')}),
        })
      }
    });
    this.map.addLayer(this.vectorLayer);

    // TODO REG: This is ugly, but I didn't find any other solution yet.
    setTimeout(() => {
      this.map.updateSize();
    }, 1000);
  }

  listenOpenLayersEvents() {
    // https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html
    //this.map.on('change', (e) => console.log(e));
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
    //this.map.on('singleclick ', (e) => console.log(e));
    //? change:layerGroup
    //? change:size
    //? change:target
    //? change:view

    // Drawing events
    this.featuresCollection.on('add', (e) => this.onFeatureAdded(this, e));

  }

  onMoveEnd(e) {
    const center = this.map.getView().getCenter();
    const mapX = center[0];
    const mapY = center[1];
    const mapZ = this.map.getView().getZoom(); 
    this.messageManager.sendMessage(GeoEvents.Init, {action: 'coordsChanged', mapX: mapX, mapY: mapY, mapZ: mapZ});
  }

  onFeatureAdded(_this, e) {
    // Set the default feature name
    const name = adjectives[_this.getRandomInt(0, adjectives.length)] + ' ' + e.element.getGeometry().getType();
    e.element.set('name', name);
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
    this.messageManager.sendMessage(GeoEvents.Init, {action: 'componentInitialized'});
  }

  attributeChangedCallback(name, oldValue, newValue, namespace) {
    console.log('attributeChangedCallback');
  }

  onTreeViewEvent(details) {
    if (details.action === 'layerEnabled') {
      this.onAddLayer(details.layer);
    }
    else if (details.action === 'layerDisabled') {
      this.onRemoveLayer(details.layer);
    }
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
          projection: this.projection
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
  }

  onChangeProjection(projection) {
    console.log('New Projection: ' + projection);
    this.srid = projection;
    this.projection = getProjection(projection);

    const currentView = this.map.getView();
    const currentProjection = currentView.getProjection();
    const currentResolution = currentView.getResolution();
    const currentCenter = currentView.getCenter();
    const currentRotation = currentView.getRotation();
    const newCenter = transform(currentCenter, currentProjection, this.projection);
    const currentMPU = currentProjection.getMetersPerUnit();
    const newMPU = this.projection.getMetersPerUnit();
    const currentPointResolution =
      getPointResolution(currentProjection, 1 / currentMPU, currentCenter, 'm') *
      currentMPU;
    const newPointResolution =
      getPointResolution(this.projection, 1 / newMPU, newCenter, 'm') * newMPU;
    const newResolution =
      (currentResolution * currentPointResolution) / newPointResolution;
    const newView = new View({
      center: newCenter,
      resolution: newResolution,
      rotation: currentRotation,
      projection: this.projection,
    });
    this.map.setView(newView);
  }

  onAddLayer(layerInfos) {
    console.log('New Layer: ' + layerInfos);
    if (layerInfos.type === 'WMS') {
      this.onAddWmsLayer(layerInfos);
    }

    // When adding a new layer to the map, 
    // We still want the vectorLayer (for redlining) to be on top position
    this.vectorLayer.setZIndex(1001);
  }

  onRemoveLayer(layerInfos) {
    console.log('New Layer: ' + layerInfos);
    if (layerInfos.type === 'WMS') {
      this.onRemoveWmsLayer(layerInfos);
    }
  }

  onAddWmsLayer(layerInfos) {
    const key = layerInfos.server + layerInfos.imageType;

    if (key in this.layersByServer) {
      // Get existing ol layer for this server
      // and add a new wms layer in the source
      const layerDef = this.layersByServer[key];
      layerDef.layerList.push(layerInfos.layer);
      const source = new ImageWMS({
        url: layerInfos.url,
        params: {
          'LAYERS': layerDef.layerList.join(','),
          'FORMAT': layerInfos.imageType
        }
      });
      layerDef.layer.setSource(source);
    }
    else {
      // Create a new ol layer
      const layer = new ImageLayer({
        //extent: [-13884991, 2870341, -7455066, 6338219],
        source: new ImageWMS({
          url: layerInfos.url,
          params: {
            'LAYERS': layerInfos.layer, 
            'FORMAT': layerInfos.imageType
          },
        })
      });
      this.layersByServer[key] = {
        layer: layer,
        layerList : [layerInfos.layer]
      };
      this.map.addLayer(layer);
    }
  }

  onRemoveWmsLayer(layerInfos) {
    const key = layerInfos.server + layerInfos.imageType;

    if (key in this.layersByServer) {
      // Get existing ol layer for this server
      // and add a new wms layer in the source
      const layerDef = this.layersByServer[key];
      layerDef.layerList = layerDef.layerList.filter(item => item !== layerInfos.layer);

      if (layerDef.layerList.length > 0) {
        // There are still layers in the list.
        // => We update the layer source
        const source = new ImageWMS({
          url: layerInfos.url,
          params: {
            'LAYERS': layerDef.layerList.join(','),
            'FORMAT': layerInfos.imageType
          }
        });
        layerDef.layer.setSource(source);
      }
      else {
        // No more layer here.
        // => We simply remove the whole layer
        delete this.layersByServer[key];
        this.map.removeLayer(layerDef.layer);
      }
    }
    else {
      console.log('Nothing to remove !')
    }
  }

  onChangeBasemap(basemap) {
    console.log('New Basemap: ' + basemap);

    // TODO REG : Use constant
    if (basemap.type === 'WMTS') {
      fetch(basemap.url)
        .then(response => response.text())
        .then(capabilities => {
          // Create new WMTS Layer from Capabilities
          const parser = new WMTSCapabilities();
          const result = parser.read(capabilities);
          const options = optionsFromCapabilities(result, {
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

  onRedliningEvent(details) {
    if (details.action === 'drawToolActivated') {
      this.activateRedliningTool(details.tool);
    }
    else if (details.action === 'deleteFeature') {
      this.deleteFeature(details.id);
    }
    else if (details.action === 'styleChanging') {
      this.setFeatureStyle(details.id, details.fillColor, details.strokeColor, details.strokeWidth);
    }
    else if (details.action === 'styleChanged') {
      console.log('styleChanged');
    }
    else if (details.action === 'nameChanging') {
      this.setFeatureName(details.id, details.name);
    }
  }

  setFeatureName(id, name) {
    const feature = this.featuresCollection.getArray().find(f => f.ol_uid === id);
    feature.set('name', name);
  }

  setFeatureStyle(id, fillColor, strokeColor, strokeWidth) {
    const feature = this.featuresCollection.getArray().find(f => f.ol_uid === id);

    let style = feature.getStyle();
    if (!style) {
      style = new Style({
        stroke: new Stroke({color: this.defaultStrokeColor, width: this.defaultStrokeWidth}),
        fill: new Fill({color: this.defaultFillColor})
      });
    }

    if (fillColor) {
      style.getFill().setColor(fillColor.hex);
    }
    if (strokeColor) {
      style.getStroke().setColor(strokeColor.hex);
    }
    if (strokeWidth) {
      console.log(strokeWidth);
      style.getStroke().setWidth(strokeWidth);
    }

    feature.setStyle(style);
  }

  deleteFeature(id) {
    const toRemove = this.featuresCollection.getArray().find(f => f.ol_uid === id);
    this.featuresCollection.remove(toRemove);
    this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'featureRemoved', id: toRemove.ol_uid});
  }

  activateRedliningTool(tool) {
    console.log('Activating Redlining Tool...');
    // First remove existing interaction.
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }
    if (this.snap) {
      this.map.removeInteraction(this.snap);
    }

    

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
      source: this.vectorSource,
      type: tool,
      freehand: freehand,
      geometryFunction: geometryFunction
    });
    const modify = new Modify({source: this.vectorSource});
    this.map.addInteraction(modify);

    this.map.addInteraction(this.draw);
    this.snap = new Snap({source: this.vectorSource});
    this.map.addInteraction(this.snap);
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
