import { Map, Feature, MapBrowserEvent, MapEvent, Collection } from 'ol';
import { Style, Stroke, Fill, Circle } from 'ol/style';
import { ProjectionLike, get as getProjection } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { DragBox } from 'ol/interaction';
import { getVectorContext } from 'ol/render';
import { easeOut } from 'ol/easing';
import { unByKey } from 'ol/Observable';
import { ScaleLine } from 'ol/control';
import { DragBoxEvent } from 'ol/interaction/DragBox';
import { Extent } from 'ol/extent';
import { Geometry } from 'ol/geom';
import { EventsKey } from 'ol/events';
import RenderEvent from 'ol/render/Event';
import { Coordinate } from 'ol/coordinate';

import { Cesium3DTileset } from 'cesium';

import SwipeManager from './tools/swipemanager';
import WmsManager from './tools/wmsmanager';
import WmsManager3d from './tools/wmsmanager3d';
import OsmManager from './tools/osmmanager';
import VectorTilesManager from './tools/vectortilesmanager';
import WmtsManager from './tools/wmtsmanager';
import ViewManager from './tools/viewmanager';
import LocalFileManager from './tools/localfilemanager';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';

import Basemap from '../../models/basemap';
import Layer from '../../models/layers/layer';
import LayerOsm from '../../models/layers/layerosm';
import LayerVectorTiles from '../../models/layers/layervectortiles';
import LayerWmts from '../../models/layers/layerwmts';
import LayerWms from '../../models/layers/layerwms';
import LayerLocalFile from '../../models/layers/layerlocalfile';
import GeoEvents from '../../models/events';

import MapManager from '../../tools/state/mapManager';
import MapPosition from '../../tools/state/mapposition';
import { BaseLayer, GroupLayer } from '../../models/main';

// read this about the import of olcesium / cesium: https://github.com/openlayers/ol-cesium/issues/953
declare global {
  interface Window {
    Cesium: unknown;
  }
}

export default class MapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  olMap: Map;
  mapTarget!: HTMLDivElement;
  // TODO REG : Howto use the right type here without importing the whole library (it needs to be imported only on demand) ?
  // This works but needs the library: type OLCesiumType = typeof OLCesium;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map3d!: any;
  map3dTarget!: HTMLDivElement;
  loading: boolean = false;
  swiper!: HTMLInputElement;
  swipeManager!: SwipeManager;
  wmtsManager!: WmtsManager;
  wmsManager!: WmsManager;
  wmsManager3d: WmsManager3d | null = null;
  osmManager!: OsmManager;
  viewManager!: ViewManager;
  vectorTilesManager!: VectorTilesManager;
  localFileManager!: LocalFileManager;

  srid!: ProjectionLike;
  get projection() {
    return getProjection(this.srid);
  }

  // For object selection
  selectedFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  focusedFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  selectionLayer!: VectorLayer<VectorSource>;
  focusLayer!: VectorLayer<VectorSource>;
  focusAnimation: EventsKey | null = null;
  pixelTolerance = 10;
  dragbox!: DragBox;

  constructor() {
    super('map');
    this.olMap = MapManager.getInstance().getMap();
  }

  registerEvents() {
    this.messageManager.register(this.onCustomGirafeEvent.bind(this));

    this.swiper.addEventListener('input', () => this.olMap.render());

    this.stateManager.subscribe('activeBasemap', (_oldBasemap: Basemap, newBasemap: Basemap) =>
      this.onChangeBasemap(newBasemap)
    );
    this.stateManager.subscribe('projection', (oldProjection: string, newProjection: string) =>
      this.onChangeProjection(oldProjection, newProjection)
    );
    this.stateManager.subscribe('interface.darkMapMode', (_oldValue: boolean, _newValue: boolean) =>
      this.onChangeDarkMode()
    );
    this.stateManager.subscribe('position', (_oldPosition: MapPosition, newPosition: MapPosition) =>
      this.onPositionChanged(newPosition)
    );
    this.stateManager.subscribe('position.scale', (_oldScale: number, newScale: number) =>
      this.onChangeScale(newScale)
    );
    this.stateManager.subscribe('position.resolution', (_oldResolution: number, newResolution: number) =>
      this.zoomToResolution(newResolution)
    );
    this.stateManager.subscribe('position.zoom', (_oldZoom: number, newZoom: number) => this.zoomToZoom(newZoom));
    this.stateManager.subscribe('position.center', (_oldCenter: Coordinate, newCenter: Coordinate) =>
      this.panToCoordinate(newCenter)
    );
    this.stateManager.subscribe('selection.selectedFeatures', (_oldFeatures: Feature[], newFeatures: Feature[]) =>
      this.onFeaturesSelected(newFeatures)
    );
    this.stateManager.subscribe('selection.focusedFeature', (_oldFeature: Feature, newFeature: Feature) =>
      this.onFeatureFocused(newFeature)
    );
    this.stateManager.subscribe(
      'layers.swipedLayers',
      (_oldLayers: { left: Layer[]; right: Layer[] }, newLayers: { left: Layer[]; right: Layer[] }) =>
        this.onSwipedLayersChanged(newLayers)
    );

    this.stateManager.subscribe('globe.display', () => this.onGlobeToggled());

    this.stateManager.subscribe(
      /layers\.layersList\..*\.activeState/,
      (_oldActive: boolean, _newActive: boolean, layer: Layer) => this.onLayerToggled(layer)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.opacity/,
      (_oldOpacity: number, _newOpacity: number, layer: Layer) => this.onChangeOpacity(layer)
    );
    this.stateManager.subscribe(
      /layers\.layersList\..*\.filter/,
      (_oldFilter: string, _newFilter: string, layer: Layer) => this.onChangeFilter(layer)
    );
    this.stateManager.subscribe(/layers\.layersList\..*\.order/, () => this.onChangeOrder([]));
  }

  render() {
    super.render();

    this.srid = this.configManager.Config.map.srid;

    // Initialize the map element
    this.mapTarget = this.shadow.getElementById('ol-map') as HTMLDivElement;
    this.map3dTarget = this.shadow.getElementById('cs-map') as HTMLDivElement;
    this.olMap.setTarget(this.mapTarget);

    // Initialize managers
    this.wmsManager = new WmsManager(this.olMap);
    this.osmManager = new OsmManager(this.olMap);
    this.viewManager = new ViewManager(this.olMap);
    this.vectorTilesManager = new VectorTilesManager(this.olMap);
    this.localFileManager = new LocalFileManager(this.olMap);
    this.wmtsManager = new WmtsManager(this.olMap);
    this.swiper = this.shadow.getElementById('swiper') as HTMLInputElement;
    this.swipeManager = new SwipeManager(
      this.olMap,
      this.swiper,
      this.wmtsManager,
      this.wmsManager,
      this.localFileManager
    );

    // View
    const view = this.viewManager.getView();
    this.olMap.setView(view);

    // Create layer for selection
    const selectionSource = new VectorSource({
      features: this.selectedFeaturesCollection
    });

    this.configManager.loadConfig().then(() => {
      this.selectionLayer = new VectorLayer({
        properties: {
          addToPrintedLayers: true
        },
        source: selectionSource,
        // TODO REG: Change default selection color
        style: new Style({
          stroke: new Stroke({
            color: this.configManager.Config.selection.defaultStrokeColor,
            width: this.configManager.Config.selection.defaultStrokeWidth
          }),
          fill: new Fill({ color: this.configManager.Config.selection.defaultFillColor }),
          image: new Circle({
            radius: 7,
            fill: new Fill({ color: this.configManager.Config.selection.defaultFillColor }),
            stroke: new Stroke({
              color: this.configManager.Config.selection.defaultStrokeColor,
              width: this.configManager.Config.selection.defaultStrokeWidth
            })
          })
        })
      });
      this.olMap.addLayer(this.selectionLayer);
      this.selectionLayer.setZIndex(1002);

      // Create layer for focus
      const focusSource = new VectorSource({
        features: this.focusedFeaturesCollection
      });
      focusSource.on('addfeature', (e) => {
        this.flash(e.feature!);
      });
      this.focusLayer = new VectorLayer({
        properties: {
          addToPrintedLayers: true
        },
        source: selectionSource,
        // TODO REG: Change default focus color
        style: new Style({
          stroke: new Stroke({
            color: this.configManager.Config.selection.defaultFocusStrokeColor,
            width: this.configManager.Config.selection.defaultFocusStrokeWidth
          }),
          fill: new Fill({ color: this.configManager.Config.selection.defaultFocusFillColor }),
          image: new Circle({
            radius: 7,
            fill: new Fill({ color: this.configManager.Config.selection.defaultFocusFillColor }),
            stroke: new Stroke({
              color: this.configManager.Config.selection.defaultFocusStrokeColor,
              width: this.configManager.Config.selection.defaultFocusStrokeWidth
            })
          })
        })
      });
      this.olMap.addLayer(this.focusLayer);
      this.focusLayer.setZIndex(1003);

      if (this.configManager.Config.map.showScaleLine) {
        const scaleLine = new ScaleLine({
          units: 'metric'
        });
        this.olMap.addControl(scaleLine);
      }
    });

    // Add dragbox selection interaction
    this.dragbox = new DragBox({
      condition: platformModifierKeyOnly
    });
    this.olMap.addInteraction(this.dragbox);
    this.dragbox.on('boxend', (e) => this.onDragSelection(e));

    // TODO REG: This is ugly, but I didn't find any other solution yet.
    setTimeout(() => {
      this.olMap.updateSize();
    }, 1000);
  }

  listenOpenLayersEvents() {
    // https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html
    //this.olMap.on('change', (e) => console.log(e));
    this.olMap.on('singleclick', (e) => this.onClick(e));
    //this.olMap.on('click', (e) => console.log(e));
    //this.olMap.on('dblclick', (e) => console.log(e));
    //this.olMap.on('error', (e) => console.log(e));
    this.olMap.on('loadstart', (e) => this.onLoadStart(e));
    this.olMap.on('loadend', (e) => this.onLoadEnd(e));
    this.olMap.on('moveend', (e) => this.onMoveEnd(e));
    //this.olMap.on('movestart', (e) => console.log(e));
    //this.olMap.on('pointerdrag', (e) => console.log(e));
    this.olMap.on('pointermove', (e) => this.onPointerMove(e));
    //this.olMap.on('postcompose', (e) => console.log(e));
    //this.olMap.on('postrender', (e) => console.log(e));
    //this.olMap.on('precompose', (e) => console.log(e));
    //this.olMap.on('propertychange', (e) => console.log(e));
    //this.olMap.on('rendercomplete', (e) => this.onRenderComplete(e));
    //? change:layerGroup
    //? change:size
    //? change:target
    //? change:view
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
    const view = this.olMap.getView();

    const newPosition = new MapPosition();
    newPosition.center = view.getCenter()!;
    newPosition.zoom = view.getZoom()!;
    newPosition.resolution = view.getResolution()!;
    newPosition.scale = this.viewManager.getScale();

    if (newPosition.isValid) {
      this.state.position = newPosition;
    }
  }

  onClick(e: MapBrowserEvent<UIEvent>) {
    // Build selectionbox using the default tolerance
    const topLeftPixel = [e.pixel[0] - this.pixelTolerance, e.pixel[1] - this.pixelTolerance];
    const topLeftCoord = this.olMap.getCoordinateFromPixel(topLeftPixel);
    const bottomRightPixel = [e.pixel[0] + this.pixelTolerance, e.pixel[1] + this.pixelTolerance];
    const bottomRightCoord = this.olMap.getCoordinateFromPixel(bottomRightPixel);
    const extent = [topLeftCoord[0], topLeftCoord[1], bottomRightCoord[0], bottomRightCoord[1]];

    this.select(extent);
  }

  onDragSelection(_e: DragBoxEvent) {
    const extent = this.dragbox.getGeometry().getExtent();
    this.select(extent);
  }

  select(extent: number[]) {
    // Reset current selection
    this.state.selection.selectedFeatures = [];
    // Layers selectable today are WMS and Local files
    this.wmsManager.selectFeatures(extent);
    this.localFileManager.selectFeatures(extent);
  }

  flash(feature: Feature) {
    const duration = 2000;
    const startStart = Date.now();
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
            width: 0.25 + opacity
          })
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
      // TODO BGE: Animation are bad for performances and should be optimized. First by re-rendering only the
      //  concerned layer and not the whole map. the style must be cached too, etc.
      // tell OpenLayers to continue postrender animation
      _this.olMap.render();
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      // this.changeCanvasColor();
      this.listenOpenLayersEvents();
      this.registerEvents();
    });
  }

  onCustomGirafeEvent(details: { action: string; layer: Layer; extent: Extent }) {
    if (details.action === GeoEvents.undoDraw) {
      //this.redliningManager.removeLastPoint();
    }
  }

  onSwipedLayersChanged(swipedLayers: { left: Layer[]; right: Layer[] }) {
    if (swipedLayers.left.length === 0 && swipedLayers.right.length === 0) {
      // TODO REG: Better manage WMS in order to combine swiped layers again in a unique olayer
      // (to minimize the amount of WMS queries that are sent to the server)
      this.swipeManager.deactivateSwipe();
    } else {
      this.swipeLayersOnSide(swipedLayers.left, 'left');
      this.swipeLayersOnSide(swipedLayers.right, 'right');
    }
  }

  swipeLayersOnSide(layers: Layer[], side: 'left' | 'right') {
    for (const layer of layers) {
      if (layer instanceof LayerWms) {
        this.swipeManager.activateSwipeForWms(layer, side);
      } else if (layer instanceof LayerWmts) {
        this.swipeManager.activateSwipeForWmts(layer, side);
      } else if (layer instanceof LayerLocalFile) {
        this.swipeManager.activateSwipeForLocalFile(layer, side);
      }
    }
  }

  async create3dMap() {
    if (!this.map3d && this.configManager.Config.map3d) {
      this.loading = true;
      super.render();
      // First : Lazy loading of Cesium and olcs
      const Cesium = await import('cesium');
      window.Cesium = Cesium;

      const olcs = await import('olcs');
      const OLCesium = olcs.default;

      // Initialize the 3D Map
      this.map3d = new OLCesium({
        map: this.olMap,
        target: this.map3dTarget,
        time: () => {
          const date = new Date(timeDatePicker.value);
          if (isNaN(date.getTime())) {
            return Cesium.JulianDate.now();
          } else {
            return Cesium.JulianDate.fromDate(date);
          }
        }
      });
      const scene = this.map3d.getCesiumScene();
      const config = this.configManager.Config.map3d;

      // Add terrain
      if (config.terrainUrl) {
        scene.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(config.terrainUrl);
      }

      // Add terrain imagery
      let coverage = Cesium.Rectangle.MAX_VALUE;
      if (config.terrainImagery) {
        if (config.terrainImagery.coverageArea) {
          coverage = Cesium.Rectangle.fromDegrees(...config.terrainImagery.coverageArea);
        }
        scene.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: config.terrainImagery.url,
            minimumLevel: config.terrainImagery.minLoD ?? 0,
            maximumLevel: config.terrainImagery.maxLoD,
            tilingScheme:
              config.terrainImagery.srid === 3857
                ? new Cesium.WebMercatorTilingScheme()
                : new Cesium.GeographicTilingScheme(),
            rectangle: coverage
          })
        );
      }

      // Add 3D-Tiles layers
      const tilesetOptions = {
        // If the error of the model is higher than this, we increase the resolution
        maximumScreenSpaceError: 0.5,
        // Enable different level of details based on the distance from the camera
        dynamicScreenSpaceError: true,
        // Model error at the max distance from the camera (higher = distant models are of lower quality)
        dynamicScreenSpaceErrorFactor: config.tilesetsMaxError ?? 7
      };
      config.tilesetsUrls.forEach((tilesetUrl) => {
        Cesium3DTileset.fromUrl(tilesetUrl, tilesetOptions).then((t: Cesium3DTileset) => scene.primitives.add(t));
      });

      // Shadows and lighting
      const date = new Date();
      const timeDatePicker = document.createElement('input');
      timeDatePicker.type = 'datetime-local';
      timeDatePicker.classList.add('ui-input');
      timeDatePicker.style.display = 'none';
      timeDatePicker.valueAsNumber = Math.round((date.valueOf() - date.getTimezoneOffset() * 60000) / 60000) * 60000;
      const timeDatePickerContainer = document.createElement('div');
      timeDatePickerContainer.appendChild(timeDatePicker);

      const shadowCheckbox = document.createElement('input');
      shadowCheckbox.type = 'checkbox';
      shadowCheckbox.onchange = () => {
        scene.shadowMap.enabled = scene.globe.enableLighting = shadowCheckbox.checked;
        timeDatePicker.style.display = shadowCheckbox.checked ? 'block' : 'none';
      };
      const shadowLabel = document.createElement('label');
      shadowLabel.innerText = 'Enable shadows';
      const shadowEnabledContainer = document.createElement('div');
      shadowEnabledContainer.classList.add('ui-input');
      shadowEnabledContainer.appendChild(shadowCheckbox);
      shadowEnabledContainer.appendChild(shadowLabel);

      const timeContainer = document.createElement('div');
      timeContainer.style.position = 'absolute';
      timeContainer.appendChild(shadowEnabledContainer);
      timeContainer.appendChild(timeDatePickerContainer);
      this.map3dTarget.appendChild(timeContainer);

      const ambientOcclusion = scene.postProcessStages.ambientOcclusion;
      ambientOcclusion.enabled = true;
      ambientOcclusion.uniforms.bias = 0.5;
      ambientOcclusion.uniforms.stepSize = 1;
      ambientOcclusion.uniforms.blurStepSize = 1;

      this.loading = false;
      this.state.globe.loaded = true;
      super.render();

      this.wmsManager3d = new WmsManager3d(scene);
      this.state.layers.layersList.forEach((l) => this.addAllActiveLayers3dMap(l));
    }
  }

  addAllActiveLayers3dMap(layer: BaseLayer) {
    if (layer instanceof LayerWms) {
      if (layer.active) {
        this.wmsManager3d?.addLayer(layer);
      }
    } else if (layer instanceof GroupLayer) {
      layer.children.forEach((l) => this.addAllActiveLayers3dMap(l));
    }
  }

  async onGlobeToggled(): Promise<void> {
    if (this.state.globe.display === 'full') {
      // Full screen globe has been enabled
      this.mapTarget.style.display = 'none';
      this.map3dTarget.style.display = 'block';
      this.map3dTarget.style.left = '0';
      this.map3dTarget.style.width = '100%';
      await this.create3dMap();
      this.map3d.setEnabled(true);
    } else if (this.state.globe.display === 'side') {
      // Side by side has been enabled
      this.mapTarget.style.display = 'inline-block';
      this.mapTarget.style.width = '45%';
      this.map3dTarget.style.display = 'inline-block';
      this.map3dTarget.style.left = '45%';
      this.map3dTarget.style.width = '55%';
      await this.create3dMap();
      this.map3d.setEnabled(true);
    } else {
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
      for (const feature of features) {
        this.selectedFeaturesCollection.push(feature);
      }
    }
  }

  onFeatureFocused(feature: Feature) {
    this.focusedFeaturesCollection.clear();
    this.focusedFeaturesCollection.push(feature);
  }

  onPositionChanged(position: MapPosition) {
    this.zoomToResolution(position.resolution);
    if (position.isValid) {
      this.panToCoordinate(position.center);
    }
  }

  onChangeScale(scale: number) {
    this.viewManager.setScale(scale);
  }

  zoomToResolution(resolution: number) {
    this.viewManager.setResolution(resolution);
  }

  zoomToZoom(zoom: number) {
    this.viewManager.setZoom(zoom);
  }

  panToCoordinate(coordinate: Coordinate) {
    this.viewManager.setCenter(coordinate);
  }

  onChangeProjection(_oldSrid: string, newSrid: string) {
    this.srid = newSrid;
    const newView = this.viewManager.getViewConvertedToSrid(newSrid);
    this.olMap.setView(newView);
  }

  onChangeDarkMode() {
    const canvas = this.shadow.querySelector('canvas');
    if (canvas) {
      canvas.style.filter = this.state.interface.darkMapMode ? 'invert(100%) hue-rotate(180deg)' : '';
    }
  }

  onLayerToggled(layer: Layer) {
    if (layer instanceof Layer) {
      if (layer.active) {
        this.onAddLayers([layer]);
      } else {
        this.onRemoveLayers([layer]);
      }
    }
  }

  onAddLayers(layerInfos: Layer[]) {
    layerInfos.forEach((l) => {
      if (l instanceof LayerWms) {
        this.wmsManager.addLayer(l);
        if (this.wmsManager3d != null) this.wmsManager3d.addLayer(l);
      } else if (l instanceof LayerWmts) {
        this.wmtsManager.addLayer(l);
      } else if (l instanceof LayerLocalFile) {
        this.localFileManager.addLayer(l);
      }
    });
  }

  onRemoveLayers(layerInfos: Layer[]) {
    layerInfos.forEach((l) => {
      if (l instanceof LayerWms) {
        this.wmsManager.removeLayer(l);
        if (this.wmsManager3d != null) this.wmsManager3d.removeLayer(l);
      } else if (l instanceof LayerWmts) {
        if (this.wmtsManager.layerExists(l)) {
          this.wmtsManager.removeLayer(l);
        }
      } else if (l instanceof LayerLocalFile) {
        this.localFileManager.removeLayer(l);
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
      if (this.wmsManager3d != null) this.wmsManager3d.changeOpacity(layerInfos);
    } else if (layerInfos instanceof LayerWmts) {
      if (this.wmtsManager.layerExists(layerInfos)) {
        this.wmtsManager.changeOpacity(layerInfos, layerInfos.opacity);
      }
    }
  }

  onChangeFilter(layerInfos: Layer) {
    if (layerInfos instanceof LayerWms) {
      this.wmsManager.changeFilter(layerInfos);
      if (this.wmsManager3d != null) this.wmsManager3d.changeFilter(layerInfos);
    }
  }

  onChangeBasemap(basemap: Basemap) {
    // First, remove all existing basemaps
    this.wmtsManager.removeAllBasemapLayers();
    this.wmsManager.removeAllBasemapLayers();
    if (this.wmsManager3d != null) this.wmsManager3d.removeAllBasemapLayers();
    this.osmManager.removeAllBasemapLayers();
    this.vectorTilesManager.removeAllBasemapLayers();

    // Then, add the selected basemaps
    basemap.layersList.forEach((layer) => {
      if (layer instanceof LayerOsm) {
        this.osmManager.addBasemapLayer(layer);
      } else if (layer instanceof LayerVectorTiles) {
        this.vectorTilesManager.addBasemapLayer(layer);
      } else if (layer instanceof LayerWmts) {
        this.wmtsManager.addBasemapLayer(layer);
      } else if (layer instanceof LayerWms) {
        this.wmsManager.addBasemapLayer(layer);
        if (this.wmsManager3d != null) this.wmsManager3d.addBasemapLayer(layer);
      } else {
        throw new Error('Unknown basemap type');
      }
    });
  }
}
