import { Map, Feature, MapBrowserEvent, MapEvent, Collection, Overlay } from 'ol';
import { Style, Stroke, Fill, Circle, RegularShape } from 'ol/style';
import { get as getProjection, ProjectionLike, transform } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { DragBox } from 'ol/interaction';
import { ScaleLine } from 'ol/control';
import { DragBoxEvent } from 'ol/interaction/DragBox';
import { Geometry, Point } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import { Extent } from 'ol/extent';

import { ScreenSpaceEventHandler, Cartesian2, Cesium3DTileset } from 'cesium';
import proj4 from 'proj4';

import SwipeManager from './tools/swipemanager';
import WmsManager from '../../tools/wms/wmsmanager';
import WmsManager3d from './tools/wmsmanager3d';
import OsmManager from './tools/osmmanager';
import VectorTilesManager from './tools/vectortilesmanager';
import WmtsManager from './tools/wmtsmanager';
import ViewManager from './tools/viewmanager';
import LocalFileManager from './tools/localfilemanager';
import CogManager from './tools/cogmanager';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';

import Basemap from '../../models/basemap';
import Layer from '../../models/layers/layer';
import LayerCog from '../../models/layers/layercog';
import LayerXYZ from '../../models/layers/layerxyz';
import LayerOsm from '../../models/layers/layerosm';
import LayerVectorTiles from '../../models/layers/layervectortiles';
import LayerWmts from '../../models/layers/layerwmts';
import LayerWms from '../../models/layers/layerwms';
import LayerLocalFile from '../../models/layers/layerlocalfile';
import GeoEvents from '../../models/events';

import MapManager from '../../tools/state/mapManager';
import MapPosition, { parseMapPositionFromUrl } from '../../tools/state/mapposition';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import { FocusFeature } from './tools/focusfeature';
import XyzManager from './tools/xyzmanager';
import ThemeLayer from '../../models/layers/themelayer';
import { debounce } from '../../tools/utils/debounce';
import SelectionParam from '../../models/selectionparam';
import WfsManager from '../../tools/wfs/wfsmanager';
import I18nManager from '../../tools/i18n/i18nmanager';
import { isProjectionInDegrees, isCoordinateInDegrees } from '../../tools/utils/olutils';

// read this about the import of olcesium / cesium: https://github.com/openlayers/ol-cesium/issues/953
declare global {
  interface Window {
    Cesium: unknown;
  }
}

export default class MapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  olMap: Map;
  mapTarget!: HTMLDivElement;
  // TODO REG : Howto use the right type here without importing the whole library (it needs to be imported only on demand) ?
  // This works but needs the library: type OLCesiumType = typeof OLCesium;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map3d!: any;
  map3dTarget!: HTMLDivElement;
  loading: boolean = false;
  swiper!: HTMLInputElement;
  closeSwiperButton!: HTMLButtonElement;
  swipeManager!: SwipeManager;
  wmtsManager!: WmtsManager;
  wmsManager!: WmsManager;
  wmsManager3d: WmsManager3d | null = null;
  osmManager!: OsmManager;
  cogManager!: CogManager;
  xyzManager!: XyzManager;
  viewManager!: ViewManager;
  vectorTilesManager!: VectorTilesManager;
  localFileManager!: LocalFileManager;
  defaultSrid!: ProjectionLike;
  crosshairFeature!: Feature;
  crosshairLayer!: VectorLayer<VectorSource>;
  tooltipContainer!: HTMLElement;
  tooltipOverlay!: Overlay;

  get projection() {
    return this.olMap.getView().getProjection();
  }

  // For object selection
  selectedFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  highlightedFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  selectionLayer!: VectorLayer<VectorSource>;
  highlightLayer!: VectorLayer<VectorSource>;
  pixelTolerance = 10;
  dragbox!: DragBox;
  focusFeature: FocusFeature;

  constructor() {
    super('map');
    this.olMap = MapManager.getInstance().getMap();
    this.focusFeature = new FocusFeature();
  }

  resetAllSwipedLayers(layers: BaseLayer[]) {
    for (const layer of layers) {
      if (layer instanceof Layer) {
        layer.swiped = 'no';
      } else if (layer instanceof GroupLayer || layer instanceof ThemeLayer) {
        this.resetAllSwipedLayers(layer.children);
      }
    }

    this.swipeManager.deactivateSwiper();
  }

  registerEvents() {
    this.swiper.addEventListener('input', () => {
      this.olMap.render();
      this.updateCloseSwiperPosition();
    });

    this.closeSwiperButton.onclick = () => {
      this.resetAllSwipedLayers(this.state.layers.layersList);
    };

    this.subscribe('activeBasemap', (_oldBasemap: Basemap, newBasemap: Basemap) => this.onChangeBasemap(newBasemap));
    this.subscribe('projection', (oldProjection: string, newProjection: string) =>
      this.onChangeProjection(oldProjection, newProjection)
    );
    this.subscribe('interface.darkMapMode', (_oldValue: boolean, _newValue: boolean) => this.onChangeDarkMode());
    this.subscribe('position', (_oldPosition: MapPosition, newPosition: MapPosition) =>
      this.onPositionChanged(newPosition)
    );
    this.subscribe('position.scale', (_oldScale: number, newScale: number) => this.onChangeScale(newScale));
    this.subscribe('position.resolution', (_oldResolution: number, newResolution: number) =>
      this.zoomToResolution(newResolution)
    );
    this.subscribe('position.zoom', (_oldZoom: number, newZoom: number) => this.zoomToZoom(newZoom));
    this.subscribe('position.center', (_oldCenter: Coordinate, newCenter: Coordinate) =>
      this.panToCoordinate(newCenter)
    );
    this.subscribe('selection.selectionParameters', (_oldParams: SelectionParam[], newParams: SelectionParam[]) =>
      this.onSelectFeatures(newParams)
    );
    this.subscribe('selection.selectedFeatures', (_oldFeatures: Feature[], newFeatures: Feature[]) =>
      this.onFeaturesSelected(newFeatures)
    );
    this.subscribe('selection.highlightedFeatures', (_oldFeatures: Feature[], newFeatures: Feature[]) =>
      this.onFeatureHighlighted(newFeatures)
    );
    this.subscribe('selection.focusedFeatures', (_oldFeature: Feature[] | null, newFeature: Feature[] | null) =>
      this.focusFeature.setFocusedFeatures(newFeature)
    );

    this.subscribe('globe.display', () => this.onGlobeToggled());

    this.subscribe(/layers\.layersList\..*\.activeState/, (_oldActive: boolean, _newActive: boolean, layer: Layer) =>
      this.onLayerToggled(layer)
    );
    this.subscribe(/layers\.layersList\..*\.opacity/, (_oldOpacity: number, _newOpacity: number, layer: Layer) =>
      this.onChangeOpacity(layer)
    );
    this.subscribe(/layers\.layersList\..*\.swiped/, (_oldOpacity: number, _newOpacity: number, layer: Layer) =>
      this.onChangeSwiped(layer)
    );
    this.subscribe(/layers\.layersList\..*\.filter/, (_oldFilter: string, _newFilter: string, layer: Layer) =>
      this.onChangeFilter(layer)
    );
    this.subscribe(/layers\.layersList\..*\.order/, () => this.onChangeOrder());
  }

  render() {
    super.render();
    this.activateTooltips(false, [800, 0], 'right');

    // Read out the default projection from config, ignoring user preferences
    this.defaultSrid = this.configManager.getDefaultConfigValue('map.srid') as string;
    this.setMapPositionFromUrlAfterInit();

    // Initialize the map element
    this.mapTarget = this.shadow.getElementById('ol-map') as HTMLDivElement;
    this.map3dTarget = this.shadow.getElementById('cs-map') as HTMLDivElement;
    this.olMap.setTarget(this.mapTarget);

    // Initialize managers
    this.wmsManager = WmsManager.getInstance();
    this.wmsManager.map = this.olMap;
    this.osmManager = new OsmManager(this.olMap);
    this.cogManager = new CogManager(this.olMap);
    this.xyzManager = new XyzManager(this.olMap);
    this.viewManager = new ViewManager(this.olMap);
    this.vectorTilesManager = new VectorTilesManager(this.olMap);
    this.localFileManager = new LocalFileManager(this.olMap);
    this.wmtsManager = new WmtsManager(this.olMap);
    this.swiper = this.shadow.getElementById('swiper') as HTMLInputElement;
    this.closeSwiperButton = this.shadow.getElementById('close-swiper') as HTMLButtonElement;
    this.swipeManager = new SwipeManager(
      this.olMap,
      this.swiper,
      this.closeSwiperButton,
      this.wmtsManager,
      this.wmsManager,
      this.localFileManager
    );

    // View
    const view = this.viewManager.getDefaultView();
    this.olMap.setView(view);

    // Create layer for highlighted features
    const highlightSource = new VectorSource({
      features: this.highlightedFeaturesCollection
    });

    // Create layer for selection
    const selectionSource = new VectorSource({
      features: this.selectedFeaturesCollection
    });

    this.configManager.loadConfig().then(() => {
      this.selectionLayer = new VectorLayer({
        properties: {
          addToPrintedLayers: true
        },
        source: selectionSource
      });
      this.highlightLayer = new VectorLayer({
        source: highlightSource
      });
      this.setSelectLayerStyle();
      this.setHighlightLayerStyle();
      this.olMap.addLayer(this.selectionLayer);
      this.olMap.addLayer(this.highlightLayer);
      this.selectionLayer.setZIndex(1002);
      this.highlightLayer.setZIndex(1003);
      this.selectionLayer.set('altitudeMode', 'clampToGround');

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

  /**
   * Add a click handler to hide the popup.
   */
  closePopup() {
    this.tooltipOverlay.setPosition(undefined);
    this.tooltipContainer.classList.add('hidden');
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
    if (!this.state.selection.enabled) {
      return;
    }
    // Build selection box using the default tolerance.
    const topLeftPixel = [e.pixel[0] - this.pixelTolerance, e.pixel[1] - this.pixelTolerance];
    const topLeftCoord = this.olMap.getCoordinateFromPixel(topLeftPixel);
    const bottomRightPixel = [e.pixel[0] + this.pixelTolerance, e.pixel[1] + this.pixelTolerance];
    const bottomRightCoord = this.olMap.getCoordinateFromPixel(bottomRightPixel);
    this.select([topLeftCoord[0], topLeftCoord[1], bottomRightCoord[0], bottomRightCoord[1]]);
  }

  onDragSelection(_e: DragBoxEvent) {
    const extent = this.dragbox.getGeometry().getExtent();
    this.select(extent);
  }

  select(extent: number[]) {
    // Reset current selection
    this.state.selection.selectedFeatures = [];
    this.state.selection.selectionParameters = [];
    this.state.selection.highlightedFeatures = [];
    // Layers selectable today are WMS, WMTS (with wms layer) and Local files
    this.wmsManager.selectFeatures(extent);
    this.wmtsManager.selectFeatures(extent);
    this.localFileManager.selectFeatures(extent);
  }

  async onSelectFeatures(selectionParams: SelectionParam[]) {
    this.state.loading = true;

    // WMS GetFeatureInfo
    const wmsPromises = selectionParams.map((param) => {
      const wmsGetFeatureInfoSelectionParam = param.clone((l) => l.queryable && !l.wfsQueryable);
      const client = this.wmsManager.getClient(wmsGetFeatureInfoSelectionParam._ogcServer);
      return client.getFeatureInfo(wmsGetFeatureInfoSelectionParam);
    });

    // WFS GetFeature
    const wfsPromises = selectionParams.map((param) => {
      const wfsGetFeatureInfoSelectionParam = param.clone((l) => l.wfsQueryable);
      const client = WfsManager.getInstance().getClient(wfsGetFeatureInfoSelectionParam._ogcServer);
      const features = client.getFeature(wfsGetFeatureInfoSelectionParam);
      return features;
    });

    const wmsGmlFeatures = (await Promise.all(wmsPromises)).flat();
    const wfsGmlFeatures = (await Promise.all(wfsPromises)).flat();

    const gmlFeatures = [...wmsGmlFeatures, ...wfsGmlFeatures];

    if (gmlFeatures.length === 0 && this.state.selection.selectedFeatures.length == 0) {
      this.state.interface.selectionComponentVisible = false;
    } else {
      this.state.selection.selectedFeatures.push(...gmlFeatures);
      this.state.interface.selectionComponentVisible = true;
    }
    this.state.loading = false;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.listenOpenLayersEvents();
      this.registerEvents();
    });
  }

  onCustomGirafeEvent(details: { action: string; layer: Layer; extent: Extent }) {
    if (details.action === GeoEvents.zoomToExtent) {
      this.zoomToExtent(details.extent);
    }
  }

  onChangeSwiped(layer: Layer) {
    this.swipeManager.toggleSwipe(layer);
    this.updateCloseSwiperPosition();
  }

  /**
   * updates icon position when swipe is moved
   */
  updateCloseSwiperPosition() {
    const sliderValue = parseFloat(this.swiper.value);
    const max = parseFloat(this.swiper.max);
    const min = parseFloat(this.swiper.min);
    const percent = (sliderValue - min) / (max - min);
    const offset = percent * this.swiper.offsetWidth;
    this.closeSwiperButton.style.left = `${offset}px`;
  }

  private setSelectLayerStyle() {
    this.selectionLayer.setStyle(
      new Style({
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
    );
  }

  private setHighlightLayerStyle() {
    this.highlightLayer.setStyle(
      new Style({
        stroke: new Stroke({
          color: this.configManager.Config.selection.highlightStrokeColor,
          width: this.configManager.Config.selection.defaultStrokeWidth
        }),
        fill: new Fill({ color: this.configManager.Config.selection.highlightFillColor }),
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: this.configManager.Config.selection.highlightFillColor }),
          stroke: new Stroke({
            color: this.configManager.Config.selection.highlightStrokeColor,
            width: this.configManager.Config.selection.defaultStrokeWidth
          })
        })
      })
    );
  }

  private setCrosshairStyle() {
    this.crosshairLayer.setStyle(
      new Style({
        image: new RegularShape({
          fill: new Fill({ color: this.configManager.Config.selection.defaultFillColor }),
          stroke: new Stroke({ color: this.configManager.Config.selection.defaultStrokeColor, width: 2 }),
          points: 4,
          radius: 10,
          radius2: 0,
          angle: 0
        })
      })
    );
  }

  async create3dMap() {
    if (!this.map3d && this.configManager.Config.map3d) {
      this.loading = true;
      super.render();
      // First : Lazy loading of Cesium and olcs
      const Cesium = await import('cesium');
      window.Cesium = Cesium;

      const olcs = await import('olcs');

      // Initialize the 3D Map
      this.map3d = new olcs.default({
        map: this.olMap,
        target: this.map3dTarget,
        time: () => {
          const date = new Date(timeDatePicker.value);
          return isNaN(date.getTime()) ? Cesium.JulianDate.now() : Cesium.JulianDate.fromDate(date);
        }
      });
      const scene = this.map3d.getCesiumScene();
      const config = this.configManager.Config.map3d;
      scene.screenSpaceCameraController.maximumZoomDistance = config.maximumZoomDistance ?? 30000;

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
      shadowLabel.innerText = I18nManager.getInstance().getTranslation('Enable shadows');
      shadowLabel.setAttribute('i18n', 'Enable shadows');
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

      const cesiumScreenToLocalCoord = (position: Cartesian2) => {
        const cart = Cesium.Cartographic.fromCartesian(pickOnGlobe(position));
        const longLat = [Cesium.Math.toDegrees(cart.longitude), Cesium.Math.toDegrees(cart.latitude)];
        return proj4('EPSG:4326', this.configManager.Config.map.srid, longLat);
      };

      const pickOnGlobe = (position: Cartesian2) => {
        const ray = scene.camera.getPickRay(position);
        return ray == undefined ? undefined : scene.globe.pick(ray, scene);
      };

      const eventHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
      eventHandler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
        // If the click is on the map and selection is enabled
        if (Cesium.defined(event.position) && this.state.selection.enabled) {
          const topLeftScreen = event.position.clone();
          topLeftScreen.x -= this.pixelTolerance;
          topLeftScreen.y -= this.pixelTolerance;
          const bottomRightScreen = event.position.clone();
          bottomRightScreen.x += this.pixelTolerance;
          bottomRightScreen.y += this.pixelTolerance;

          const topLeft = cesiumScreenToLocalCoord(topLeftScreen);
          const bottomRight = cesiumScreenToLocalCoord(bottomRightScreen);
          this.select([topLeft[0], topLeft[1], bottomRight[0], bottomRight[1]]);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

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
    if (this.state.globe.display === '3D') {
      // Full screen globe has been enabled
      this.mapTarget.style.display = 'none';
      this.map3dTarget.style.display = 'block';
      this.map3dTarget.style.left = '0';
      this.map3dTarget.style.width = '100%';
      await this.create3dMap();
      this.map3d.setEnabled(true);
    } else if (this.state.globe.display === '2D/3D') {
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
      // Recreate the style in case user preferences have changed in the meantime
      this.setSelectLayerStyle();
    }
  }

  onFeatureHighlighted(features: Feature[]) {
    this.highlightedFeaturesCollection.clear();
    for (const feature of features) {
      this.highlightedFeaturesCollection.push(feature);
    }
    // Recreate the style in case user preferences have changed in the meantime
    this.setHighlightLayerStyle();
  }

  onPositionChanged(position: MapPosition) {
    this.zoomToResolution(position.resolution);
    if (position.isValid) {
      this.panToCoordinate(position.center);
      this.updateUrlWithMapPosition();
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
  zoomToExtent(extent: Extent) {
    this.olMap.getView().fit(extent);
  }

  panToCoordinate(coordinate: Coordinate) {
    this.viewManager.setCenter(coordinate);
  }

  onChangeProjection(_oldSrid: string, newSrid: string) {
    const newView = this.viewManager.getViewConvertedToSrid(newSrid);
    this.olMap.setView(newView);
  }

  onChangeDarkMode() {
    if (this.state.interface.darkMapMode) {
      this.mapTarget.classList.add('darkmap');
    } else {
      this.mapTarget.classList.remove('darkmap');
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
        this.wmsManager.getClient(l).addLayer(l);
        if (this.wmsManager3d != null) this.wmsManager3d.addLayer(l);
      } else if (l instanceof LayerWmts) {
        this.wmtsManager.addLayer(l);
      } else if (l instanceof LayerLocalFile) {
        this.localFileManager.addLayer(l);
      } else if (l instanceof LayerCog) {
        this.cogManager.addLayer(l);
      } else if (l instanceof LayerXYZ) {
        this.xyzManager.addLayer(l);
      }
    });
  }

  onRemoveLayers(layerInfos: Layer[]) {
    layerInfos.forEach((l) => {
      if (l instanceof LayerWms) {
        this.wmsManager.getClient(l).removeLayer(l);
        if (this.wmsManager3d != null) {
          this.wmsManager3d.removeLayer(l);
        }
      } else if (l instanceof LayerWmts) {
        this.wmtsManager.removeLayer(l);
      } else if (l instanceof LayerLocalFile) {
        this.localFileManager.removeLayer(l);
      } else if (l instanceof LayerCog) {
        this.cogManager.removeLayer(l);
      } else if (l instanceof LayerXYZ) {
        this.xyzManager.removeLayer(l);
      }
    });
  }

  onChangeOrder = debounce(() => this.reorderLayers(), 0);
  private reorderLayers() {
    console.log('ORDER CHANGED FOR MAP');
    this.wmtsManager.refreshZIndexes();
    this.wmsManager.refreshZIndexes();
  }

  onChangeOpacity(layerInfos: Layer) {
    if (layerInfos instanceof LayerWms) {
      this.wmsManager.getClient(layerInfos).changeOpacity(layerInfos);
      if (this.wmsManager3d != null) this.wmsManager3d.changeOpacity(layerInfos);
    } else if (layerInfos instanceof LayerWmts) {
      if (this.wmtsManager.layerExists(layerInfos)) {
        this.wmtsManager.changeOpacity(layerInfos, layerInfos.opacity);
      }
    }
  }

  onChangeFilter(layerInfos: Layer) {
    if (layerInfos instanceof LayerWms) {
      this.wmsManager.getClient(layerInfos).changeFilter(layerInfos);
      if (this.wmsManager3d != null) this.wmsManager3d.changeFilter(layerInfos);
    }
  }

  onChangeBasemap(basemap: Basemap) {
    // First, remove all existing basemaps
    this.wmtsManager.removeAllBasemapLayers();
    this.wmsManager.removeAllBasemapLayers();
    if (this.wmsManager3d != null) this.wmsManager3d.removeAllBasemapLayers();
    this.osmManager.removeAllBasemapLayers();
    this.cogManager.removeAllBasemapLayers();
    this.xyzManager.removeAllBasemapLayers();
    this.vectorTilesManager.removeAllBasemapLayers();

    // Then, add the selected basemaps
    for (const layer of basemap.layersList) {
      if (layer instanceof LayerOsm) {
        this.osmManager.addBasemapLayer(layer);
      } else if (layer instanceof LayerVectorTiles) {
        this.vectorTilesManager.addBasemapLayer(layer);
      } else if (layer instanceof LayerCog) {
        this.cogManager.addBasemapLayer(layer);
      } else if (layer instanceof LayerXYZ) {
        this.xyzManager.addBasemapLayer(layer);
      } else if (layer instanceof LayerWmts) {
        this.wmtsManager.addBasemapLayer(layer);
      } else if (layer instanceof LayerWms) {
        this.wmsManager.getClient(layer).addBasemapLayer(layer);
        if (this.wmsManager3d != null) this.wmsManager3d.addBasemapLayer(layer);
      } else {
        throw new Error('Unknown basemap type');
      }
    }
  }

  // TODO REG: Move the 3 following methods to a dedicated manager to manage URL status globaly?
  /**
   * Add the current map position and zoom level to the URL. The coordinates are provided in
   * the default reference system or in WGS84.
   */
  private updateUrlWithMapPosition() {
    let mapX = this.state.position.center[0];
    let mapY = this.state.position.center[1];
    if (!mapX || !mapY) {
      return;
    }
    if (!isProjectionInDegrees()) {
      // Round to meters
      mapX = Math.round(mapX);
      mapY = Math.round(mapY);
    }

    const currentPosition = new MapPosition();
    currentPosition.center = [mapX, mapY];
    currentPosition.zoom = this.state.position.zoom;

    // Transform position if it's not in the default reference system or WGS84
    if (this.state.projection !== this.defaultSrid && this.state.projection !== 'EPSG:4326') {
      currentPosition.center = transform(currentPosition.center, this.projection, 'EPSG:4326');
    }

    const url = new URL(window.location.href);
    url.searchParams.set('map_x', JSON.stringify(currentPosition.center[0]));
    url.searchParams.set('map_y', JSON.stringify(currentPosition.center[1]));
    url.searchParams.set('map_zoom', JSON.stringify(currentPosition.zoom));
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Reads the map position data from the URL and applies it to the map,
   * making sure map initialization and loading of the shared state have finished beforehand.
   */
  private setMapPositionFromUrlAfterInit() {
    const positionFromUrl = parseMapPositionFromUrl();
    if (!positionFromUrl) {
      return;
    }

    if (this.stateManager.state.sharedStateIsLoaded === false) {
      // A shared state exists and has to be loaded first
      this.subscribe('sharedStateIsLoaded', (_: boolean, isLoaded: boolean) => {
        if (isLoaded) {
          this.applyMapPositionFromUrl(positionFromUrl);
        }
      });
    } else {
      this.olMap.once('rendercomplete', () => {
        this.applyMapPositionFromUrl(positionFromUrl);
      });
    }
  }

  /**
   * Updates the map position based on a provided position from the URL. Ensures the position is transformed
   * to the correct map reference system and applies it to the map view if valid.
   * @param {MapPosition} position - The map position object, including center coordinates in the default reference
   * system or WGS84, and zoom level.
   */
  private applyMapPositionFromUrl(position: MapPosition) {
    // Make sure the map has finished initializing
    if (!this.state.projection || !this.olMap.getView().getResolution()) {
      return;
    }

    // Transform position into current map reference system
    const projectionInUrl = getProjection(isCoordinateInDegrees(position.center) ? 'EPSG:4326' : this.defaultSrid)!;
    if (projectionInUrl.getCode() !== this.state.projection) {
      position.center = transform(position.center, projectionInUrl, this.projection);
    }

    if (position.crosshair) {
      // Remove existing crosshair first
      if (this.crosshairFeature) {
        this.olMap.removeLayer(this.crosshairLayer);
      }

      // Set new crosshair
      this.crosshairFeature = new Feature(new Point(position.center));
      this.crosshairLayer = new VectorLayer({ source: new VectorSource({ features: [this.crosshairFeature] }) });
      this.setCrosshairStyle();
      this.olMap.addLayer(this.crosshairLayer);
    }

    if (position.tooltip) {
      this.tooltipContainer = this.shadow.getElementById('popup') as HTMLElement;
      const tooltipContent = this.shadow.getElementById('popup-content') as HTMLElement;

      // Remove existing overlay first
      if (this.tooltipOverlay) {
        this.olMap.removeOverlay(this.tooltipOverlay);
      }

      // Create new overlay
      this.tooltipOverlay = new Overlay({
        element: this.tooltipContainer,
        autoPan: {
          animation: {
            duration: 250
          }
        }
      });
      this.olMap.addOverlay(this.tooltipOverlay);
      tooltipContent.innerHTML = position.tooltip;
      this.tooltipOverlay.setPosition(position.center);
      this.tooltipContainer.classList.remove('hidden');
    }

    if (position.isValid) {
      this.olMap.getView().setCenter(position.center);
      this.olMap.getView().setZoom(position.zoom);
    }
  }
}
