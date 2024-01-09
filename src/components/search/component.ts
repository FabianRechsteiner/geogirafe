import { buffer, getWidth, getHeight, Extent } from 'ol/extent';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import GeoEvents from '../../models/events';
import SearchResult from '../../models/searchresult';
import ThemesManager from '../../tools/themesmanager';

class SearchComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  themeManager: ThemesManager;

  #ignoreBlur = false;
  groupedResults: Record<string, SearchResult[]> = {};
  forceHide: boolean = false;

  searchTermPlaceholder = '###SEARCHTERM###';
  searchLangPlaceholder = '###SEARCHLANG###';

  constructor() {
    super('search');
    this.themeManager = ThemesManager.getInstance();
  }

  ignoreBlur() {
    this.#ignoreBlur = true;
  }

  onFocusIn() {
    this.forceHide = false;
    super.render();
  }

  onFocusOut() {
    if (!this.#ignoreBlur) {
      this.forceHide = true;
      super.render();
    }
    this.#ignoreBlur = false;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      super.girafeTranslate();
    });
  }

  clearSearch() {
    this.groupedResults = {};
    this.forceHide = false;
    super.render();
  }

  async doSearch(e: Event) {
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

  displayResults(results: { type: string; features: SearchResult[] }) {
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

    // And then rerender the results
    super.render();
  }

  getIconClassName(type: string) {
    // TODO: Do not hardcode values here
    switch (type) {
      case 'Adresse':
        return 'fa-solid fa-location-dot';
      case 'Basel Info (BI)':
        return 'fa-solid fa-map-location-dot';
      case 'Baumnummer öffentlicher Baumkataster':
        return 'fa-solid fa-tree';
      case 'Entsorgungsstellen':
        return 'fa-solid fa-recycle';
      case 'Haltestelle öffentlicher Verkehr':
        return 'fa-solid fa-train-subway';
      case 'Group':
        return 'fa-solid fa-layer-group';
      case 'Layer':
        return 'fa-solid fa-map';
      default:
        return 'fa-solid fa-globe';
    }
  }

  onSelect(result: SearchResult) {
    this.#ignoreBlur = false;
    this.forceHide = true;
    super.render();

    console.log(result);

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
  }

  zoomTo(extent: Extent) {
    // We create a buffer around the extent from 50% of the width/height
    const bufferValue = Math.max((getWidth(extent) * 50) / 100, (getHeight(extent) * 50) / 100);
    const bufferedExtent = buffer(extent, bufferValue);

    this.messageManager.sendMessage({ action: GeoEvents.zoomToExtent, extent: bufferedExtent });
  }
}

export default SearchComponent;
