import Map from 'ol/Map';
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Geometry, LineString, MultiLineString, MultiPolygon, Point, MultiPoint, Polygon } from 'ol/geom';
import { Style, Icon, Stroke, Fill } from 'ol/style';
import { buffer, getWidth, getHeight, getCenter, containsExtent, Extent } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import Picker from 'vanilla-picker';

import PinIcon from './images/pin.svg';
import LayerIcon from './images/layer.svg';
import LayerGroupIcon from './images/layergroup.svg';
import SearchIcon from './images/search.svg';
import PaintbrushIcon from './images/paintbrush.svg';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import SearchResult, { type GeometryResult, GeometryCollectionResult } from '../../models/searchresult';
import ThemesManager from '../../tools/themesmanager';
import MapManager from '../../tools/state/mapManager';
import Layer from '../../models/layers/layer';
import LayerManager from '../../tools/layermanager';
import { parseCoordinates } from '../../tools/geometrytools';

class SearchComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  public searchIcon: string = SearchIcon;
  public paintbrushIcon: string = PaintbrushIcon;

  private themeManager: ThemesManager;
  private layerManager: LayerManager;
  private readonly map: Map;
  private previewFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  private previewLayer: Layer | null = null;
  private previewGeoLayer: VectorLayer<VectorSource> | null = null;
  private maxExtent?: number[];

  private ignoreBlur = false;
  public groupedResults: Record<string, SearchResult[]> = {};
  protected allResults: SearchResult[] = [];
  protected forceHide: boolean = true;

  private searchTermPlaceholder = '###SEARCHTERM###';
  private searchLangPlaceholder = '###SEARCHLANG###';
  private COORD_REGEX = /^(\d+[.,]?\d*)\s*[,;/\s]\s*(\d+[.,]?\d*)$/;

  private focusedResultIndex: number = -1;
  private focusedResult: SearchResult | null = null;
  private selectedResult: SearchResult | null = null;

  private searchBox?: HTMLInputElement;

  public paintSearchResults?: boolean;
  public defaultSearchStrokeColor?: string;

  constructor() {
    super('search');
    this.themeManager = ThemesManager.getInstance();
    this.layerManager = LayerManager.getInstance();
    this.map = MapManager.getInstance().getMap();
    this.createPreviewLayer();
  }

  private createPreviewLayer() {
    this.configManager.loadConfig().then(() => {
      this.paintSearchResults = this.configManager.Config.search.paintSearchResults;
      this.defaultSearchStrokeColor = this.configManager.Config.search.defaultStrokeColor;
      this.maxExtent = this.configManager.Config.map.maxExtent?.split(',').map(Number);

      this.initColorPicker();
      const previewStyle = new Style({
        stroke: new Stroke({
          color: this.configManager.Config.search.defaultStrokeColor,
          width: this.configManager.Config.search.defaultStrokeWidth
        }),
        fill: new Fill({ color: this.configManager.Config.search.defaultFillColor }),
        image: new Icon({
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: this.getColoredPinIcon(this.configManager.Config.search.defaultStrokeColor as string),
          scale: 0.3
        })
      });
      this.previewGeoLayer = new VectorLayer({
        properties: {
          addToPrintedLayers: true
        },
        source: new VectorSource({
          features: this.previewFeaturesCollection
        }),
        style: previewStyle
      });
      this.map.addLayer(this.previewGeoLayer);
      this.previewGeoLayer.setZIndex(1010);
    });
  }

  public onMouseDown() {
    this.ignoreBlur = true;
  }

  public onFocusIn() {
    this.forceHide = false;
    super.render();
  }

  public onFocusOut() {
    if (!this.ignoreBlur) {
      this.forceHide = true;
      super.render();
    }
    this.ignoreBlur = false;
  }

  public render() {
    super.render();
    this.searchBox = this.shadowRoot?.getElementById('search') as HTMLInputElement;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
    });
  }

  protected clearSearch(purge: boolean = false) {
    if (purge) {
      if (this.searchBox) {
        this.searchBox.value = '';
      }
    }
    this.forceHide = false;
    this.groupedResults = {};
    this.allResults = [];
    this.clearPreview();
    this.focusedResultIndex = -1;
    this.focusedResult = null;
    super.render();
  }

  public async doSearch(e: Event) {
    const target = e.target! as HTMLInputElement;
    const term = target.value.trim();
    this.clearSearch();

    if (this.COORD_REGEX.test(term)) {
      this.displayCoordinates(term);
      return;
    }
    if (term.length > 0) {
      const url = this.configManager.Config.search.url
        .replace(this.searchTermPlaceholder, term)
        .replace(this.searchLangPlaceholder, this.state.language!);
      const response = await fetch(url);
      const data = await response.json();
      this.displayResults(data);
    }
  }

  /**
   * Will render the result of the search with coordinates
   * @param term typed string
   */
  private displayCoordinates(term: string) {
    const matches = this.COORD_REGEX.exec(term)!;
    let coord1 = parseFloat(matches[1].replace(',', '.'));
    let coord2 = parseFloat(matches[2].replace(',', '.'));

    const current_srid = this.map.getView().getProjection().getCode();
    const [east_coord, north_coord] = parseCoordinates([coord1, coord2], this.maxExtent, current_srid);
    // Don't show result if no corresponding coordinates were parsed
    if (!east_coord || !north_coord) {
      return;
    }

    const result = {
      bbox: [east_coord, north_coord, east_coord, north_coord],
      geometry: {
        type: 'Point',
        coordinates: [east_coord, north_coord]
      },
      properties: {
        label: `${coord1} ${coord2}`,
        layer_name: 'recenter_map'
      }
    } as SearchResult;

    this.allResults = [result];
    this.groupedResults['recenter_map'] = [result];
    super.render();
    super.girafeTranslate();
  }

  private displayResults(results: { type: string; features: SearchResult[] }) {
    // First, group the results
    results.features.forEach((result) => {
      const type = result.properties ? result.properties.layer_name : 'ERROR: Missing type in the search result';

      let resultList: SearchResult[];
      if (type in this.groupedResults) {
        resultList = this.groupedResults[type];
      } else {
        resultList = [];
        this.groupedResults[type] = resultList;
      }

      resultList.push(result);
    });

    // Manage a flat list with all results
    this.allResults = Object.values(this.groupedResults).flatMap((results) => results);

    // And then rerender the results
    super.render();
    super.girafeTranslate();
  }

  public getIcon(searchGroup: string) {
    switch (searchGroup) {
      case 'Group':
        return LayerGroupIcon;
      case 'Layer':
        return LayerIcon;
      default:
        return PinIcon;
    }
  }

  public onMouseOver(result: SearchResult) {
    this.focusResult(result);
  }

  public onMouseLeave() {
    // Clear preview search result, only if the result was not selected
    if (this.selectedResult === null) {
      this.clearPreview();
    }
  }

  private focusResultFromIndex() {
    const result = this.allResults[this.focusedResultIndex];
    this.focusResult(result);
  }

  private focusResult(result: SearchResult) {
    // Clear old selection and preview
    this.clearPreview();
    if (this.focusedResult) {
      this.focusedResult.selected = false;
    }

    // Set new selected object, and activate preview
    this.focusedResultIndex = this.allResults.findIndex((r) => r === result);
    this.focusedResult = this.allResults[this.focusedResultIndex];
    this.focusedResult.selected = true;
    this.render();
    this.preview(result);

    // Scroll to selected div
    const resultHtmlElement = this.shadow.querySelectorAll('.result')[this.focusedResultIndex];
    resultHtmlElement.scrollIntoView({ block: 'nearest' });
  }

  private preview(result: SearchResult) {
    if (result.bbox && this.configManager.Config.search.objectPreview) {
      // Result with geometry
      if (result.geometry) {
        this.addFeatureToPreview(result.geometry);
      }
    } else if (result.properties?.actions[0].action === 'add_layer' && this.configManager.Config.search.layerPreview) {
      const layer = this.themeManager.findLayerByName(result.properties?.actions[0].data);
      if (!this.state.layers.layersList.includes(layer)) {
        // Preview layer
        this.previewLayer = layer;
        this.state.layers.layersList.push(this.previewLayer);
        this.layerManager.toggleLayer(this.previewLayer, 'on');
      }
    }
  }

  private addFeatureToPreview(geometry: GeometryResult | GeometryCollectionResult) {
    switch (geometry.type) {
      case 'Point': {
        const feature = new Feature<Point>(new Point(geometry.coordinates as Coordinate));
        this.previewFeaturesCollection.push(feature);
        return;
      }
      case 'MultiPoint': {
        const feature = new Feature<MultiPoint>(new MultiPoint(geometry.coordinates as Coordinate[]));
        this.previewFeaturesCollection.push(feature);
        return;
      }
      case 'MultiLineString': {
        const feature = new Feature<MultiLineString>(new MultiLineString(geometry.coordinates as Coordinate[][]));
        this.previewFeaturesCollection.push(feature);
        return;
      }
      case 'LineString': {
        const feature = new Feature<LineString>(new LineString(geometry.coordinates as Coordinate[]));
        this.previewFeaturesCollection.push(feature);
        return;
      }
      case 'Polygon': {
        const feature = new Feature<Polygon>(new Polygon(geometry.coordinates as Coordinate[][]));
        this.previewFeaturesCollection.push(feature);
        return;
      }
      case 'MultiPolygon': {
        const feature = new Feature<MultiPolygon>(new MultiPolygon(geometry.coordinates as Coordinate[][][]));
        this.previewFeaturesCollection.push(feature);
        return;
      }
      case 'GeometryCollection': {
        geometry.geometries.forEach((geom) => {
          this.addFeatureToPreview(geom);
        });
        return;
      }
      default:
        throw new Error(`Geometry type of search result is not being supported.`);
    }
  }

  public clearPreview() {
    // Clear preview search result
    this.previewFeaturesCollection.clear();

    // Clear preview layer
    if (this.previewLayer) {
      const treeItemId = this.previewLayer.treeItemId;
      this.layerManager.toggleLayer(this.previewLayer, 'off');
      const index = this.state.layers.layersList.findIndex((l) => l.treeItemId === treeItemId);
      if (index >= 0) {
        this.state.layers.layersList.splice(index, 1);
      } else {
        console.warn('Error while removing preview layer.');
      }
      this.previewLayer = null;
    }
  }

  public onSelect(result: SearchResult) {
    this.selectedResult = result;
    this.ignoreBlur = false;
    this.forceHide = true;
    this.previewLayer = null;
    super.render();

    if (result.bbox) {
      // Result with geometry
      this.zoomTo(result.bbox);
    } else if (result.properties?.actions[0].action === 'add_group') {
      const group = this.themeManager.findGroupByName(result.properties?.actions[0].data);
      if (!this.state.layers.layersList.includes(group)) {
        this.state.layers.layersList.push(group);
      }
    } else if (result.properties?.actions[0].action === 'add_layer') {
      const layer = this.themeManager.findLayerByName(result.properties?.actions[0].data);
      if (!this.state.layers.layersList.includes(layer)) {
        this.state.layers.layersList.push(layer);
      }
    } else {
      console.warn('Unsupported result type');
    }
    this.onFocusOut();

    // Update searchbox with result
    if (this.searchBox && result.properties) {
      this.searchBox.value = result.properties.label;
    }
  }

  private zoomTo(extent: Extent) {
    // We create a buffer around the extent from 50% of the width/height
    const bufferValue = Math.max((getWidth(extent) * 50) / 100, (getHeight(extent) * 50) / 100);
    const bufferedExtent = buffer(extent, bufferValue);

    const minResolution = this.configManager.Config.search.minResolution;
    const currentResolution = this.map.getView().getResolution()!;
    const currentExtent = this.map.getView().calculateExtent();

    if (minResolution) {
      if (currentResolution > minResolution) {
        // If we are in a bigger resolution as the minimal one,
        // Zoom to object with minResolution
        MapManager.getInstance().zoomToExtent(bufferedExtent, minResolution);
      } else if (!containsExtent(currentExtent, extent)) {
        // Else, if the extent is NOT already within the current extent of the map
        // We keep the current resolution, and just pan to object
        this.state.position.center = getCenter(extent);
      }
    }
    // Otherwise, if the serached object is already in the current map extent
    // We do nothing
  }

  public onMouseMove() {
    // if the mouse moves, we activate the hover effect
    const results = this.shadowRoot?.querySelectorAll('.result');
    for (const result of results!) {
      result.classList.remove('active');
      const htmlResult = result as HTMLElement;
      htmlResult.style.removeProperty('background-color');
    }
  }

  public onKeyDown(e: KeyboardEvent) {
    // clear search on escape
    if (e.key === 'Escape') {
      this.clearSearch(true);
    }

    // automatic re-open search results on enter
    else if (this.forceHide) {
      if (e.key === 'Enter') {
        this.onFocusIn();
      }
    }

    // navigate through search results
    else if (!this.forceHide) {
      this.navigateToResult(e);
    }
  }

  private navigateToResult(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        if (this.focusedResultIndex < this.allResults.length - 1) {
          this.focusedResultIndex += 1;
          this.focusResultFromIndex();
        }
        break;

      case 'ArrowUp':
        if (this.focusedResultIndex > 0) {
          this.focusedResultIndex -= 1;
          this.focusResultFromIndex();
        }
        break;

      case 'Enter':
        if (this.focusedResultIndex >= 0) {
          this.onSelect(this.allResults[this.focusedResultIndex]);
        }
        break;
    }
  }

  private initColorPicker() {
    super.render();
    const colorPicker = this.shadowRoot?.getElementById('colorPickerBtn');
    if (colorPicker) {
      const fillPicker = new Picker({
        parent: colorPicker,
        color: this.configManager.Config.search.defaultStrokeColor,
        popup: 'right'
      });
      fillPicker.onChange = (color: Picker.Color) => {
        // The fill color should be the selected color with a bit more transparency
        const fillColor = [color.rgba[0], color.rgba[1], color.rgba[2], color.rgba[3] / 2];
        this.previewGeoLayer?.setStyle(
          new Style({
            stroke: new Stroke({
              color: color.hex,
              width: this.configManager.Config.search.defaultStrokeWidth
            }),
            fill: new Fill({ color: fillColor }),
            image: new Icon({
              anchor: [0.5, 1],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction',
              src: this.getColoredPinIcon(color.hex),
              scale: 0.3
            })
          })
        );
      };
    }
  }

  private getColoredPinIcon(hexColor: string) {
    const pin = `<svg xmlns="http://www.w3.org/2000/svg" 
                      width="120" 
                      height="120" 
                      style="fill: ${hexColor};" 
                      viewBox="0 0 384 512">
                    <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 
                             307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
                 </svg>`;

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(pin);
  }
}

export default SearchComponent;
