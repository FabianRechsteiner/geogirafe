import Map from 'ol/Map';
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Geometry, Point } from 'ol/geom';
import { Style, Icon } from 'ol/style';
import { buffer, getWidth, getHeight, getCenter, containsExtent, Extent } from 'ol/extent';

import PinIcon from './images/pin.svg';
import LayerIcon from './images/layer.svg';
import LayerGroupIcon from './images/layergroup.svg';
import SearchIcon from './images/search.svg';
import CloseIcon from './images/close.svg';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import SearchResult from '../../models/searchresult';
import ThemesManager from '../../tools/themesmanager';
import MapManager from '../../tools/state/mapManager';
import Layer from '../../models/layers/layer';
import LayerManager from '../../tools/layermanager';

class SearchComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  public searchIcon: string = SearchIcon;
  public closeIcon: string = CloseIcon;

  private themeManager: ThemesManager;
  private layerManager: LayerManager;
  private readonly map: Map;
  private previewFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  private previewLayer: Layer | null = null;

  private ignoreBlur = false;
  public groupedResults: Record<string, SearchResult[]> = {};
  private allResults: SearchResult[] = [];
  private forceHide: boolean = true;

  private searchTermPlaceholder = '###SEARCHTERM###';
  private searchLangPlaceholder = '###SEARCHLANG###';

  private focusedResultIndex: number = -1;
  private focusedResult: SearchResult | null = null;
  private selectedResult: SearchResult | null = null;

  private searchBox?: HTMLInputElement;

  constructor() {
    super('search');
    this.themeManager = ThemesManager.getInstance();
    this.layerManager = LayerManager.getInstance();
    this.map = MapManager.getInstance().getMap();
    this.createPreviewLayer();
  }

  private createPreviewLayer() {
    const vectorLayer = new VectorLayer({
      properties: {
        addToPrintedLayers: true
      },
      source: new VectorSource({
        features: this.previewFeaturesCollection
      }),
      style: new Style({
        image: new Icon({
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: PinIcon,
          scale: 0.3
        })
      })
    });
    this.map.addLayer(vectorLayer);
    vectorLayer.setZIndex(1010);
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

  private clearSearch(purge: boolean = false) {
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
    const target = e.target as HTMLInputElement;
    if (target) {
      const term: string = target.value;
      this.clearSearch();
      if (term.length > 0) {
        const url = this.configManager.Config.search.url
          .replace(this.searchTermPlaceholder, term)
          .replace(this.searchLangPlaceholder, this.state.language!);
        const response = await fetch(url);
        const data = await response.json();
        this.displayResults(data);
      }
    }
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
      const feature = new Feature<Point>(new Point(getCenter(result.bbox)));
      this.previewFeaturesCollection.push(feature);
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

    if (currentResolution > minResolution) {
      // If we are in a bigger resolution as the minimal one,
      // Zoom to object with minResolution
      MapManager.getInstance().zoomToExtent(bufferedExtent, minResolution);
    } else if (!containsExtent(currentExtent, extent)) {
      // Else, if the extent is NOT already within the current extent of the map
      // We keep the current resolution, and just pan to object
      this.state.position.center = getCenter(extent);
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
}

export default SearchComponent;
