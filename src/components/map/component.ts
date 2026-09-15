// SPDX-License-Identifier: Apache-2.0
import { Collection, Feature, Map, MapBrowserEvent, MapEvent } from 'ol';
import { Circle, Fill, Icon, RegularShape, Stroke, Style } from 'ol/style';
import { ProjectionLike } from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { DragBox } from 'ol/interaction';
import { ScaleLine } from 'ol/control';
import { DragBoxEvent } from 'ol/interaction/DragBox';
import { Geometry, GeometryCollection, Point } from 'ol/geom';
import { Extent, getCenter, getHeight, getWidth } from 'ol/extent';

import { Cartesian2, Cesium3DTileset, ScreenSpaceEventHandler } from 'cesium';
import proj4 from 'proj4';

import SwipeManager from './tools/swipemanager';
import WmsManager3d from './tools/wmsmanager3d';
import OsmManager from './tools/osmmanager';
import VectorTilesManager from './tools/vectortilesmanager';
import WmtsManager from './tools/wmtsmanager';
import ViewManager from './tools/viewmanager';
import CogManager from './tools/cogmanager';
import DrawingManager from './tools/drawingmanager';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';

import Basemap from '../../models/basemaps/basemap';
import Layer from '../../models/layers/layer';
import LayerCog from '../../models/layers/layercog';
import LayerXYZ from '../../models/layers/layerxyz';
import LayerOsm from '../../models/layers/layerosm';
import LayerVectorTiles from '../../models/layers/layervectortiles';
import LayerWmts from '../../models/layers/layerwmts';
import LayerWms from '../../models/layers/layerwms';
import LayerLocalFile from '../../models/layers/layerlocalfile';
import LayerDrawing from '../../models/layers/layerdrawing';
import GeoEvents from '../../models/events';
import MapPosition from '../../tools/state/mapposition';
import BaseLayer from '../../models/layers/baselayer';
import GroupLayer from '../../models/layers/grouplayer';
import { FocusFeature } from './tools/focusfeature';
import XyzManager from './tools/xyzmanager';
import ThemeLayer from '../../models/layers/themelayer';
import { isTimeAwareLayer } from '../../models/layers/timeawarelayer';
import { debounce } from '../../tools/utils/debounce';
import SelectionParam from '../../models/selectionparam';
import { CameraConfig } from '../../tools/state/globe';
import CircleStyle from 'ol/style/Circle';
import { parseCoordinates } from '../../tools/geometrytools';
import CircleGeom from 'ol/geom/Circle';
import WfsFilter from '../../tools/wfs/wfsfilter';
import { Callback } from '../../tools/state/statemanager';
import { applyFeaturesToSelection, applyOpacityToLayers } from '../../tools/utils/utils';
import { SelectionMode } from '../../models/selection';
import { platformModifierKeyOnly } from 'ol/events/condition';
import { Coordinate } from 'ol/coordinate';

// read this about the import of olcesium / cesium: https://github.com/openlayers/ol-cesium/issues/953
declare global {
  interface Window {
    Cesium: unknown;
  }
}

export default class MapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  olMap!: Map;
  mapTarget!: HTMLDivElement;
  // TODO REG : Howto use the right type here without importing the whole library (it needs to be imported only on demand) ?
  // This works but needs the library: type OLCesiumType = typeof OLCesium;
  map3d!: any;
  map3dTarget!: HTMLDivElement;
  map3dShadowsTimestamp!: number;
  loading: boolean = false;
  swiper!: HTMLInputElement;
  closeSwiperButton!: HTMLButtonElement;
  swipeManager!: SwipeManager;
  wmtsManager!: WmtsManager;
  wmsManager3d: WmsManager3d | null = null;
  osmManager!: OsmManager;
  cogManager!: CogManager;
  xyzManager!: XyzManager;
  drawingManager!: DrawingManager;
  viewManager!: ViewManager;
  vectorTilesManager!: VectorTilesManager;
  defaultSrid!: ProjectionLike;
  crosshairFeature!: Feature;
  crosshairLayer!: VectorLayer<VectorSource>;
  geolocationSource!: VectorSource;

  private readonly markerSource = new VectorSource();
  private readonly markerLayer = new VectorLayer({
    source: this.markerSource
  });

  get projection() {
    return this.olMap.getView().getProjection();
  }

  get config() {
    return this.context.configManager.Config;
  }

  /**
   *
   * @param path Overridden to make those methods public for this component
   * @param callback
   */
  public override subscribe(path: string, callback: Callback): Callback;
  public override subscribe(path: RegExp, callback: Callback): Callback;
  public override subscribe(path: string | RegExp, callback: Callback): Callback {
    // @ts-expect-error The call would have succeeded against this implementation,
    // but implementation signatures of overloads are not externally visible.
    return super.subscribe(path, callback);
  }

  // For object selection
  selectedFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  highlightedFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  selectionLayer!: VectorLayer<VectorSource>;
  highlightLayer!: VectorLayer<VectorSource>;
  pixelTolerance = 10;
  dragbox!: DragBox;
  focusFeature!: FocusFeature;

  mapTargetResizeObserver!: ResizeObserver;

  public constructor() {
    super('map');
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

    this.subscribe('activeBasemaps', (_: Basemap[], newBasemaps: Basemap[]) => this.onChangeBasemaps(newBasemaps));
    this.subscribe(/activeBasemaps\.\d\.opacity/, (_oldOpacity: number, _newOpacity: number, basemap: Basemap) =>
      this.onChangeBasemapOpacity(basemap)
    );
    this.subscribe('projection', (oldProjection: string, newProjection: string) =>
      this.onChangeProjection(oldProjection, newProjection)
    );
    this.subscribe('interface.darkMapMode', () => this.onChangeDarkMode());
    this.subscribe('selection.selectionParameters', (_: SelectionParam[], newParams: SelectionParam[]) =>
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
    this.subscribe('position.markers', () => {
      this.clearAllMarkers();
      for (const marker of this.state.position.markers) {
        this.addMarker(marker.position, marker.imageUrl);
      }
    });

    this.subscribe('globe.display', async () => {
      await this.onGlobeToggled();
      this.onCameraChanged(this.state.globe.camera);
    });
    this.subscribe('globe.shadows', (_oldShadows: boolean, newShadows: boolean) => this.onShadowsToggled(newShadows));
    this.subscribe('globe.shadowsTimestamp', (_oldTimestamp: number, newTimestamp: number) =>
      this.onShadowsTimestampChanged(newTimestamp)
    );
    this.subscribe('globe.camera', async (_oldCamera: CameraConfig, newCamera: CameraConfig) => {
      await this.onGlobeToggled();
      this.onCameraChanged(newCamera);
    });

    this.subscribe(
      /layers\.layersList\..*\.activeState/,
      async (_oldActive: boolean, _newActive: boolean, layer: Layer) => {
        await this.onLayerToggled(layer);
        if (layer.active) {
          this.onChangeSwiped(layer);
        }
      }
    );
    this.subscribe(/layers\.layersList\..*\.opacity/, (_oldOpacity: number, _newOpacity: number, layer: Layer) =>
      this.onChangeLayerOpacity(layer)
    );
    this.subscribe(/layers\.layersList\..*\.swiped/, (_oldOpacity: number, _newOpacity: number, layer: Layer) =>
      this.onChangeSwiped(layer)
    );
    this.subscribe(/layers\.layersList\..*\.filter/, (_oldFilter: string, _newFilter: string, layer: LayerWms) =>
      this.onChangeFilter(layer)
    );
    this.subscribe(
      /layers\.layersList\..*\.timeRestriction/,
      (_oldTime: string, _newTime: string, layer: GroupLayer | LayerWms) => this.onChangeTime(layer)
    );
    this.subscribe(/layers\.layersList\..*\.order/, () => this.onChangeOrder());

    this.subscribe('application.isReady', (_: boolean, isLoaded: boolean) => {
      if (isLoaded) {
        // The map component may not be fully ready when other part of the application will be initialized
        // And some operations that need a fuly loaded map need to be first done when the application is ready
        // For example, Permalink needs resolution,
        this.onCameraChanged(this.state.globe.camera);
        // If the app is opened from a permalink, prioritize this data over settings in the shared state
        if (this.context.permalinkManager.hasFeatureSelectionQuery()) {
          this.applyFeatureSelectionFromPermalink();
        } else if (this.context.permalinkManager.hasMapPosition()) {
          this.applyMapPositionFromPermalink();
        } else {
          this.applyFeatureSelectionFromSharedState();
        }
        this.showCrosshair(this.state.position);
        for (const marker of this.state.position.markers) {
          this.addMarker(marker.position, marker.imageUrl);
        }
      }
    });
  }

  locateUser() {
    if ('geolocation' in navigator) {
      // The user's current position is utilized to show the distance to objects in the layer
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted' || result.state === 'prompt') {
          this.shadow.getElementById('disable-location')?.classList.remove('hidden');
          this.getCurrentLocation();
        }
      });
    } else {
      void window.gAlert('Geolocation browser error', 'Error');
    }
  }

  getCurrentLocation() {
    navigator.geolocation.getCurrentPosition(
      this.updateGeolocation,
      function (positionError) {
        switch (positionError.code) {
          case positionError.PERMISSION_DENIED:
            void window.gAlert('Geolocation permission denied', 'Error');
            break;
          case positionError.POSITION_UNAVAILABLE:
            void window.gAlert('Geolocation permission unavailable', 'Error');
            break;
          case positionError.TIMEOUT:
            void window.gAlert('Geolocation timeout', 'Error');
            break;
          default:
            void window.gAlert('Geolocation error', 'Error');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  disableLocateUser = (): void => {
    this.geolocationSource.clear();
    this.shadow.getElementById('disable-location')?.classList.add('hidden');
  };

  readonly updateGeolocation = (position: GeolocationPosition): void => {
    const coords = position.coords;
    const longitude = coords.longitude;
    const latitude = coords.latitude;
    const accuracy = coords.accuracy; //Accuracy radius in meters

    const code = this.olMap.getView().getProjection().getCode();
    const maxExtent = this.config.map.maxExtent?.split(',').map(Number);
    const numbers = parseCoordinates([longitude, latitude], maxExtent, code);

    this.geolocationSource.clear();
    // point of location
    const positionFeature = new Feature({
      geometry: new Point(numbers),
      type: 'position'
    });
    this.geolocationSource.addFeature(positionFeature);

    // radius accuracy
    const circleGeometry = new CircleGeom(numbers, accuracy);
    const accuracyFeature = new Feature({
      geometry: circleGeometry,
      type: 'accuracy'
    });
    this.geolocationSource.addFeature(accuracyFeature);

    this.olMap.getView().setCenter(numbers);
  };

  override render() {
    super.render();

    // Read out the default projection from config, ignoring user preferences
    this.defaultSrid = this.context.configManager.getDefaultConfigValue('map.srid') as string;

    // Initialize the map element
    this.mapTarget = this.shadow.getElementById('ol-map') as HTMLDivElement;
    this.map3dTarget = this.shadow.getElementById('cs-map') as HTMLDivElement;
    this.olMap.setTarget(this.mapTarget);

    // Initialize managers
    this.osmManager = new OsmManager(this.olMap);
    this.cogManager = new CogManager(this.olMap);
    this.xyzManager = new XyzManager(this.olMap);
    this.drawingManager = new DrawingManager(this.olMap);
    this.viewManager = new ViewManager(this.olMap, this.context.configManager, this.context.stateManager);
    this.vectorTilesManager = new VectorTilesManager(this.olMap);
    this.wmtsManager = new WmtsManager(this.olMap, this.context.stateManager);
    this.swiper = this.shadow.getElementById('swiper') as HTMLInputElement;
    this.closeSwiperButton = this.shadow.getElementById('close-swiper') as HTMLButtonElement;
    this.swipeManager = new SwipeManager(
      this.olMap,
      this.swiper,
      this.closeSwiperButton,
      this.wmtsManager,
      this.context.wmsManager,
      this.context.localFileManager
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
    this.olMap.addLayer(this.markerLayer);
    this.selectionLayer.setZIndex(1002);
    this.highlightLayer.setZIndex(1003);
    this.selectionLayer.set('altitudeMode', 'clampToGround');

    if (this.config.map.showScaleLine) {
      const scaleLine = new ScaleLine({
        units: 'metric'
      });
      this.olMap.addControl(scaleLine);
    }

    //layer user location
    this.geolocationSource = new VectorSource();
    const geolocationLayer = new VectorLayer({
      source: this.geolocationSource,
      style: new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: 'rgba(225,18,18,0.48)'
          }),
          stroke: new Stroke({
            color: 'rgb(225,18,18)',
            width: 2
          })
        }),
        fill: new Fill({
          color: 'rgba(20,100,213,0.49)'
        }),
        stroke: new Stroke({
          color: 'rgb(20,100,213)',
          width: 1
        })
      })
    });
    this.olMap.addLayer(geolocationLayer);

    // TODO REG: This is ugly, but I didn't find any other solution yet.
    setTimeout(() => {
      this.olMap.updateSize();
    }, 1000);

    this.mapTargetResizeObserver = new ResizeObserver(() => {
      this.updateCloseSwiperPosition();
    });
    this.mapTargetResizeObserver.observe(this.mapTarget);
  }

  listenOpenLayersEvents() {
    // https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html
    //this.olMap.on('change', (e) => console.log(e));
    //this.olMap.on('click', (e) => console.log(e));
    //this.olMap.on('dblclick', (e) => console.log(e));
    //this.olMap.on('error', (e) => console.log(e));
    this.olMap.on('loadstart', (e) => this.onLoadStart(e));
    this.olMap.on('loadend', (e) => this.onLoadEnd(e));
    //this.olMap.on('movestart', (e) => console.log(e));
    //this.olMap.on('pointerdrag', (e) => console.log(e));
    //this.olMap.on('postcompose', (e) => console.log(e));
    //this.olMap.on('postrender', (e) => console.log(e));
    //this.olMap.on('precompose', (e) => console.log(e));
    //this.olMap.on('propertychange', (e) => console.log(e));
    //this.olMap.on('rendercomplete', (e) => console.log(e));
    //? change:layerGroup
    //? change:size
    //? change:target
    //? change:view

    // Register all mouse and keyboard interactions with the UserInteractionManager as non-exclusive
    // events. If another tool registers one of these events exclusively, the listeners bellow will
    // be paused temporarily and reactivate once the tool is closed.

    // Select features via GetFeatureInfo
    if (this.registerInteractionListener('map.select', false)) {
      // Simple click for single feature selection
      this.olMap.on('singleclick', (e) => {
        if (this.canExecute('map.select')) {
          this.onClick(e as MapBrowserEvent<PointerEvent>);
        }
      });

      // Dragbox interaction for multiple features selection
      this.dragbox = new DragBox({
        condition: (e) => platformModifierKeyOnly(e) && this.canExecute('map.select')
      });
      this.olMap.addInteraction(this.dragbox);
      this.dragbox.on('boxend', (e) => this.onDragSelection(e));
    }

    if (this.registerInteractionListener('map.mousemove', false)) {
      // Current map position
      this.olMap.on('moveend', (e) => {
        if (this.canExecute('map.mousemove')) {
          this.onMoveEnd(e as MapBrowserEvent<PointerEvent>);
        }
      });
      // Cursor coordinates
      this.olMap.on('pointermove', (e) => {
        if (this.canExecute('map.mousemove')) {
          this.onPointerMove(e as MapBrowserEvent<PointerEvent>);
        }
      });
    }
  }

  onLoadStart(_e: MapEvent) {
    this.state.loading = true;
  }

  onLoadEnd(_e: MapEvent) {
    this.state.loading = false;
  }

  onPointerMove(e: MapBrowserEvent<PointerEvent>) {
    this.state.mouseCoordinates = e.coordinate;
  }

  onMoveEnd(_e: MapEvent) {
    const view = this.olMap.getView();

    const newPosition = this.state.position.clone();
    newPosition.center = view.getCenter()!;
    newPosition.zoom = view.getZoom()!;
    newPosition.resolution = view.getResolution()!;
    newPosition.scale = this.viewManager.getScale();

    if (newPosition.isValid) {
      this.state.position = newPosition;
    }
  }

  onClick(e: MapBrowserEvent<PointerEvent>) {
    // Build the selection box using the default tolerance. Note that the origin of the pixel coordinates is in
    // the top left corner, whereas the origin of the map coordinates is in the bottom left corner.
    // To get a valid bounding box [xMin, yMin, xMax, yMax] is needed.
    const lowerLeftPixel = [e.pixel[0] - this.pixelTolerance, e.pixel[1] + this.pixelTolerance];
    const lowerLeftCoord = this.olMap.getCoordinateFromPixel(lowerLeftPixel);
    const topRightPixel = [e.pixel[0] + this.pixelTolerance, e.pixel[1] - this.pixelTolerance];
    const topRightCoord = this.olMap.getCoordinateFromPixel(topRightPixel);
    this.select([lowerLeftCoord[0], lowerLeftCoord[1], topRightCoord[0], topRightCoord[1]]);
  }

  onDragSelection(_e: DragBoxEvent) {
    const extent = this.dragbox.getGeometry().getExtent();
    this.select(extent);
  }

  select(extent: number[]) {
    // Reset current selection if SelectionMode is Replace
    if (this.state.selection.selectionMode === SelectionMode.Replace) {
      this.selectNone();
    } else if (this.state.selection.selectionMode === SelectionMode.Add) {
      this.state.selection.selectionParameters = [];
    }
    // Layers selectable today are WMS, WMTS (with wms layer) and Local files
    // Use batch for changes to prevent multiple selection of objects
    this.context.stateManager.batchChanges(() => {
      this.context.wmsManager.selectFeatures(extent);
      this.wmtsManager.selectFeatures(extent);
      this.context.localFileManager.selectFeatures(extent);
    });
  }

  selectNone() {
    this.state.selection.selectedFeatures = [];
    this.state.selection.selectionParameters = [];
    this.state.selection.highlightedFeatures = [];
  }

  async onSelectFeatures(selectionParams: SelectionParam[]) {
    if (selectionParams.length === 0) {
      return;
    }

    this.state.loading = true;
    try {
      // WMS GetFeatureInfo
      const wmsPromises = selectionParams.map((param) => {
        const wmsGetFeatureInfoSelectionParam = param.clone((l) => l.queryable && l.wmsQueryableOnly);
        const client = this.context.wmsManager.getClient(wmsGetFeatureInfoSelectionParam.ogcServer);
        return client.getFeatureInfo(wmsGetFeatureInfoSelectionParam);
      });

      // WFS GetFeature
      const wfsPromises = selectionParams.map((param) => {
        const wfsGetFeatureInfoSelectionParam = param.clone((l) => l.wfsQueryable);
        const client = this.context.wfsManager.getClient(wfsGetFeatureInfoSelectionParam.ogcServer);
        const features = client.getFeature(wfsGetFeatureInfoSelectionParam);
        return features;
      });

      const wmsGmlFeatures = (await Promise.all(wmsPromises)).flat();
      const wfsGmlFeatures = (await Promise.all(wfsPromises)).flat();

      const gmlFeatures = [...wmsGmlFeatures, ...wfsGmlFeatures];

      if (gmlFeatures.length === 0 && this.state.selection.selectedFeatures.length === 0) {
        this.state.interface.selectionComponentVisible = false;
      } else {
        applyFeaturesToSelection(gmlFeatures, this.state);
      }
    } finally {
      this.state.loading = false;
    }
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.olMap = this.context.mapManager.getMap();
    this.focusFeature = new FocusFeature(this.olMap, this.context.configManager);
    this.render();
    this.listenOpenLayersEvents();
    this.registerEvents();
    this.onGlobeToggled();
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
    const sliderValue = Number.parseFloat(this.swiper.value);
    const max = Number.parseFloat(this.swiper.max);
    const min = Number.parseFloat(this.swiper.min);
    const percent = (sliderValue - min) / (max - min);
    const offset = percent * this.swiper.offsetWidth;
    this.closeSwiperButton.style.left = `${offset}px`;
  }

  private setSelectLayerStyle() {
    this.selectionLayer.setStyle(
      new Style({
        stroke: new Stroke({
          color: this.config.selection.defaultStrokeColor,
          width: this.config.selection.defaultStrokeWidth
        }),
        fill: new Fill({ color: this.config.selection.defaultFillColor }),
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: this.config.selection.defaultFillColor }),
          stroke: new Stroke({
            color: this.config.selection.defaultStrokeColor,
            width: this.config.selection.defaultStrokeWidth
          })
        })
      })
    );
  }

  private setHighlightLayerStyle() {
    this.highlightLayer.setStyle(
      new Style({
        stroke: new Stroke({
          color: this.config.selection.highlightStrokeColor,
          width: this.config.selection.defaultStrokeWidth
        }),
        fill: new Fill({ color: this.config.selection.highlightFillColor }),
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: this.config.selection.highlightFillColor }),
          stroke: new Stroke({
            color: this.config.selection.highlightStrokeColor,
            width: this.config.selection.defaultStrokeWidth
          })
        })
      })
    );
  }

  private setCrosshairStyle() {
    this.crosshairLayer.setStyle(
      new Style({
        image: new RegularShape({
          fill: new Fill({ color: this.config.selection.defaultFillColor }),
          stroke: new Stroke({ color: this.config.selection.defaultStrokeColor, width: 2 }),
          points: 4,
          radius: 10,
          radius2: 0,
          angle: 0
        })
      })
    );
  }

  async create3dMap() {
    if (!this.map3d && this.config.map3d) {
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
          const date = new Date(this.map3dShadowsTimestamp);
          return Number.isNaN(date.getTime()) ? Cesium.JulianDate.now() : Cesium.JulianDate.fromDate(date);
        }
      });
      const scene = this.map3d.getCesiumScene();
      const config = this.config.map3d;
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

      // REG: ambientOcclusion was temporary deactivated because of performance impact and horizontal lines artefacts
      // const ambientOcclusion = scene.postProcessStages.ambientOcclusion;
      // ambientOcclusion.enabled = true;
      // ambientOcclusion.uniforms.bias = 0.5;
      // ambientOcclusion.uniforms.stepSize = 1;
      // ambientOcclusion.uniforms.blurStepSize = 1;

      // REG: Adding the following line solves the problem, but it remains a log less performatn with ambiant occlusion.
      // So I don't know what we want to do with it.
      // See https://github.com/CesiumGS/cesium/issues/13039#issuecomment-3583233494
      // viewer.camera.frustum.near = 1.0;

      this.loading = false;
      this.state.globe.loaded = true;
      super.render();

      const cesiumScreenToLocalCoord = (position: Cartesian2) => {
        const cart = Cesium.Cartographic.fromCartesian(pickOnGlobe(position));
        const longLat = [Cesium.Math.toDegrees(cart.longitude), Cesium.Math.toDegrees(cart.latitude)];
        return proj4('EPSG:4326', this.config.map.srid, longLat);
      };

      const pickOnGlobe = (position: Cartesian2) => {
        const ray = scene.camera.getPickRay(position);
        return ray == undefined ? undefined : scene.globe.pick(ray, scene);
      };

      this.registerInteractionListener('globe.select', true);
      const eventHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
      eventHandler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
        // If the click is on the map and selection is allowed
        if (Cesium.defined(event.position) && this.canExecute('globe.select')) {
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

      this.wmsManager3d = new WmsManager3d(scene, this.context);
      this.state.layers.layersList.forEach((l) => this.addAllActiveLayers3dMap(l));

      const camera = scene.camera;
      camera.changed.addEventListener(() => {
        console.debug('Cesium camera moved');
        this.state.globe.camera = {
          heading: camera.heading,
          pitch: camera.pitch,
          roll: camera.roll
        } as CameraConfig;
      }, 1);
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
      this.unregisterInteractionListeners('globe.select');
    }
  }

  onShadowsToggled(shadows: boolean) {
    if (this.map3d) {
      const scene = this.map3d.getCesiumScene();
      scene.shadowMap.enabled = scene.globe.enableLighting = shadows;
    }
  }

  onShadowsTimestampChanged(shadowsTimestamp: number) {
    if (this.map3d) {
      this.map3dShadowsTimestamp = shadowsTimestamp;
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

  onCameraChanged(camera: CameraConfig | null) {
    if (this.map3d && camera) {
      const scene = this.map3d.getCesiumScene();
      scene.camera.setView({
        destination: scene.camera.position, // Keep current position
        orientation: {
          heading: camera.heading,
          pitch: camera.pitch,
          roll: camera.roll
        }
      });
    }
  }

  zoomToExtent(extent: Extent) {
    this.olMap.getView().fit(extent);
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

  private async onLayerToggled(layer: Layer) {
    if (layer instanceof Layer) {
      if (layer.active) {
        await this.onAddLayers([layer]);
      } else {
        this.onRemoveLayers([layer]);
      }
    }
  }

  private async onAddLayers(layerInfos: Layer[]) {
    for (const l of layerInfos) {
      if (l instanceof LayerWms) {
        this.context.wmsManager.getClient(l).addLayer(l);
        if (this.wmsManager3d != null) this.wmsManager3d.addLayer(l);
      } else if (l instanceof LayerWmts) {
        await this.wmtsManager.addLayer(l);
      } else if (l instanceof LayerLocalFile) {
        this.context.localFileManager.addLayer(l);
      } else if (l instanceof LayerCog) {
        this.cogManager.addLayer(l);
      } else if (l instanceof LayerXYZ) {
        this.xyzManager.addLayer(l);
      } else if (l instanceof LayerDrawing) {
        this.drawingManager.addLayer(l);
      }
    }
  }

  onRemoveLayers(layerInfos: Layer[]) {
    for (const l of layerInfos) {
      if (l instanceof LayerWms) {
        this.context.wmsManager.getClient(l).removeLayer(l);
        if (this.wmsManager3d != null) {
          this.wmsManager3d.removeLayer(l);
        }
      } else if (l instanceof LayerWmts) {
        this.wmtsManager.removeLayer(l);
      } else if (l instanceof LayerLocalFile) {
        this.context.localFileManager.removeLayer(l);
      } else if (l instanceof LayerCog) {
        this.cogManager.removeLayer(l);
      } else if (l instanceof LayerXYZ) {
        this.xyzManager.removeLayer(l);
      } else if (l instanceof LayerDrawing) {
        this.drawingManager.removeLayer(l);
      }
    }
  }

  onChangeOrder = debounce(() => this.reorderLayers(), 0);
  private reorderLayers() {
    this.wmtsManager.refreshZIndexes();
    this.context.wmsManager.refreshZIndexes();
  }

  private onChangeLayerOpacity(layerInfos: BaseLayer) {
    if (layerInfos instanceof LayerWms) {
      this.context.wmsManager.getClient(layerInfos).changeOpacity(layerInfos);
      if (this.wmsManager3d != null) this.wmsManager3d.changeOpacity(layerInfos);
    } else if (layerInfos instanceof LayerWmts) {
      if (this.wmtsManager.layerExists(layerInfos)) {
        this.wmtsManager.changeOpacity(layerInfos);
      }
    } else if (layerInfos instanceof LayerLocalFile) {
      this.context.localFileManager.changeOpacity(layerInfos);
    } else if (layerInfos instanceof LayerDrawing) {
      this.drawingManager.changeOpacity(layerInfos);
    } else if (layerInfos instanceof LayerOsm) {
      this.osmManager.changeOpacity(layerInfos);
    } else {
      console.warn(`Changing opacity for layer ${layerInfos.name} of type ${typeof layerInfos} not supported`);
    }
  }

  private onChangeBasemapOpacity(basemap: Basemap) {
    applyOpacityToLayers(basemap.opacity, basemap.layersList, (layer: BaseLayer) => this.onChangeLayerOpacity(layer));
  }

  /**
   * Change filter configuration on layer (only LayerWMS are affected)
   */
  private onChangeFilter(layerInfos: LayerWms) {
    this.context.wmsManager.getClient(layerInfos).changeFilter(layerInfos);
    if (this.wmsManager3d != null) this.wmsManager3d.changeFilter(layerInfos);
  }

  /**
   * Change time configuration on layer (only LayerWMS are affected)
   */
  private onChangeTime(layer: GroupLayer | LayerWms) {
    if (layer instanceof LayerWms && layer.active) {
      this.context.wmsManager.getClient(layer).changeTimeRestriction(layer);
    } else if (layer instanceof GroupLayer) {
      this.context.stateManager.batchChanges(() => {
        // Recursively apply the time restriction to all children of the group layer
        this.setTimeRestrictionOnChildren(layer, layer.timeRestriction);
      });
    }
  }

  private setTimeRestrictionOnChildren(layer: GroupLayer, newTime: string | undefined) {
    for (const childLayer of layer.children) {
      if (childLayer instanceof GroupLayer) {
        this.setTimeRestrictionOnChildren(childLayer, newTime);
      } else if (isTimeAwareLayer(childLayer) && childLayer.timeRestriction !== newTime) {
        childLayer.timeRestriction = newTime;
      }
    }
  }

  removeAllBasemapLayers() {
    this.wmtsManager.removeAllBasemapLayers();
    this.context.wmsManager.removeAllBasemapLayers();
    if (this.wmsManager3d != null) this.wmsManager3d.removeAllBasemapLayers();
    this.osmManager.removeAllBasemapLayers();
    this.cogManager.removeAllBasemapLayers();
    this.xyzManager.removeAllBasemapLayers();
    this.vectorTilesManager.removeAllBasemapLayers();
  }

  onChangeBasemaps(basemaps: Basemap[]) {
    this.removeAllBasemapLayers();

    for (const layer of basemaps.flatMap((basemap) => basemap.layersList)) {
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
        this.context.wmsManager.getClient(layer).addBasemapLayer(layer);
        if (this.wmsManager3d != null) this.wmsManager3d.addBasemapLayer(layer);
      } else {
        throw new TypeError('Unknown basemap type');
      }
    }

    // Apply default opacity
    for (const basemap of basemaps) {
      if (!basemap.opacityDisabled) {
        this.onChangeBasemapOpacity(basemap);
      }
    }
  }

  /**
   * This method checks for the presence of an initial selection originating from a shared state.
   * If present, it applies the query-based or bbox-based selection to the map.
   */
  private applyFeatureSelectionFromSharedState() {
    if (this.state.selection.initialSelectionQuery) {
      const layerName = this.state.selection.initialSelectionQuery.layerName;
      const query = this.state.selection.initialSelectionQuery.query;
      const layer = this.context.layerManager.getTreeItemByLayerName(layerName);
      if (layer && layer instanceof LayerWms) {
        this.selectFeaturesByQuery(layer, query, false);
      }
    } else if (this.state.selection.initialSelectionBox) {
      this.select(this.state.selection.initialSelectionBox);
    }
  }

  /**
   * Applies a feature selection based on the query parameters present in the URL starting with `wfs_`.
   * If the specified layer does not exist in the current tree, it's fetched from the themes and added to the tree.
   * If the layer is resolution-restricted, the map is zoomed to a resolution where the layer is visible.
   */
  private applyFeatureSelectionFromPermalink() {
    const featureSelectionFromUrl = this.context.permalinkManager.getFeatureSelectionQuery();
    if (!featureSelectionFromUrl) {
      return;
    }
    let layerInTree = this.context.layerManager.getTreeItemByLayerName(featureSelectionFromUrl.layer);

    if (!layerInTree) {
      const layer = this.context.themesHelper.findLayerByName(featureSelectionFromUrl.layer);
      if (!layer) {
        throw new Error(`Layer ${featureSelectionFromUrl.layer} cannot be found`);
      }
      const clonedTheme = this.context.themesHelper.getMinimalClonedThemeForLayer(layer);
      clonedTheme.isExpanded = true;
      this.context.themesHelper.mergeThemeInLayerTree(clonedTheme, true, true);
      // Now, get the tree item
      layerInTree = this.context.layerManager.getTreeItemByLayerName(featureSelectionFromUrl.layer);
    }

    if (!(layerInTree && layerInTree instanceof LayerWms && layerInTree.wfsQueryable)) {
      throw new Error(
        `Can't apply feature selection from permalink, layer ${featureSelectionFromUrl.layer} does not exist or does not support querying`
      );
    }

    // Make sure the layer is rendered in the map, otherwise WFS querying won't work
    const currentResolution = this.olMap.getView().getResolution();
    if (layerInTree.minResolution && currentResolution && layerInTree.minResolution > currentResolution) {
      this.state.position.resolution = layerInTree.minResolution;
    } else if (layerInTree.maxResolution && currentResolution && layerInTree.maxResolution < currentResolution) {
      this.state.position.resolution = layerInTree.maxResolution;
    }
    if (layerInTree.activeState !== 'on') {
      this.context.layerManager.toggleLayer(layerInTree, 'on');
    }

    // Create the query as a list of wfs filters that will be combined with an AND operator by the WFS client
    const queries: WfsFilter[] = [];
    featureSelectionFromUrl.properties.forEach((property) => {
      // Note: PropertyType 'string' will result in correct WFS filters for both strings and numbers
      queries.push(new WfsFilter(property.name, 'eq', property.value, '', 'string'));
    });

    this.selectFeaturesByQuery(layerInTree, queries);
  }

  /**
   * Selects features based on the given list of wfs filters for a specified WMS layer
   * and optionally moves the map to the selection. The WFS client combines the WFS filters with an AND operator.
   */
  private selectFeaturesByQuery(layerInTree: LayerWms, query: WfsFilter[], moveMapToSelection: boolean = true) {
    // Listen for the completed features selection, then move the map to the selected features
    if (moveMapToSelection) {
      const selectSubscription = this.subscribe('selection.selectedFeatures', (_, newFeatures: Feature[]) => {
        this.unsubscribe(selectSubscription);
        this.centerMapOnFeatures(newFeatures);
      });
    }

    // Trigger the selection
    this.context.wmsManager.selectFeaturesByQuery(query, layerInTree);
  }

  /**
   * Centers the map view on the given features. If the features' extent doesn't fit in the current zoom level,
   * the zoom level is adjusted.
   */
  private centerMapOnFeatures(features: Feature[]) {
    const selectedGeometries = new GeometryCollection(
      features.map((f) => f.getGeometry()).filter((f) => f != undefined)
    );
    const featuresExtent = selectedGeometries.getExtent();
    const mapExtent = this.olMap.getView().calculateExtent();
    if (getWidth(featuresExtent) <= getWidth(mapExtent) && getHeight(featuresExtent) <= getHeight(mapExtent)) {
      // Move the map so all selected features are visible -> this won't change the zoom level
      this.state.position.center = getCenter(featuresExtent);
    } else {
      // Fit the map view so all features are visible -> this will change the zoom level
      this.zoomToExtent(featuresExtent);
    }
  }

  /**
   * Moves the map to the position defined in the permalink, making sure the map is initialized and ready to be moved.
   */
  private applyMapPositionFromPermalink() {
    const position = this.context.permalinkManager.getMapPosition(this.projection);
    if (position?.isValid) {
      // We need the following to recalculate resolution and scale to properly update the position state
      this.state.position = position;
      if (position.markers.length > 0) {
        // Add marker to the map
        this.addMarker(position.markers[0].position, position.markers[0].imageUrl);
      }
    }
  }

  private clearAllMarkers() {
    this.markerSource.clear();
  }

  private addMarker(position: Coordinate, imageUrl: string) {
    const iconStyle = new Style({
      image: new Icon({
        //anchor: [0.5, 1], // Point d'ancrage (centre en bas)
        src: imageUrl
        //scale: 0.5, // Ajustez la taille si nécessaire
      })
    });
    const marker = new Feature({
      geometry: new Point(position)
    });
    marker.setStyle(iconStyle);
    this.markerSource.addFeature(marker);
  }

  private showCrosshair(position: MapPosition) {
    if (!position.crosshair) {
      return;
    }

    // Remove existing crosshair first
    if (this.crosshairFeature) {
      this.olMap.removeLayer(this.crosshairLayer);
    }

    // Set new crosshair
    this.crosshairFeature = new Feature(new Point(position.crosshair));
    this.crosshairLayer = new VectorLayer({ source: new VectorSource({ features: [this.crosshairFeature] }) });
    this.setCrosshairStyle();
    this.olMap.addLayer(this.crosshairLayer);
  }
}
