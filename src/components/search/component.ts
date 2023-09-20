import {buffer, getWidth, getHeight, Extent} from 'ol/extent';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import GeoEvents from '../../models/events';
import SearchResult from '../../models/searchresult';

class SearchComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  #searchBox?: HTMLElement;
  #resultsBox?: HTMLElement;
  ignoreBlur = false;

  resultList: any[] = [];

  searchTermPlaceholder = '###SEARCHTERM###';
  initialSearchBoxHeight = this.convertRemToPixels(2.5);

  constructor() {
    super('search');
  }

  get searchBox() {
    if (!this.#searchBox) {
      throw new Error('You called searchBox before render');
    }
    return this.#searchBox;
  }

  get resultsBox() {
    if (!this.#resultsBox) {
      throw new Error('You called resultsBox before render');
    }
    return this.#resultsBox;
  }

  render() {
    super.render();

    // Get default height of searchBox
    this.#searchBox = this.shadow.querySelector('#searchbox')!;
    this.#resultsBox = this.shadow.querySelector('#results')!;
  }

  registerEvents() {
    this.searchBox.addEventListener('input', (e) => this.doSearch(e));
    this.searchBox.addEventListener('focusin', (_e) => this.onFocusIn());
    this.searchBox.addEventListener('focusout', (_e) => this.onFocusOut());
  }

  onFocusIn() {
    this.ignoreBlur = false;
    this.resultsBox.style.display = 'block';
    this.setSearchBoxHeight(this.initialSearchBoxHeight + this.resultsBox.offsetHeight + 20);
  }

  onFocusOut() {
    if (!this.ignoreBlur) {
      this.resultsBox.style.display = 'none';
      this.setSearchBoxHeight(this.initialSearchBoxHeight);
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }

  clearSearch() {
    this.resultList = [];
    this.resultsBox.innerHTML = '';
    this.setSearchBoxHeight(this.initialSearchBoxHeight);
  }

  doSearch(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target) {
      const term: string = target.value;
      if (term.length <= 0) {
        this.clearSearch();
        return;
      }

      const url = this.configManager.Config.search.url.replace(this.searchTermPlaceholder, term);
      fetch(url)
        .then(response => response.json())
        .then(data => this.displayResults(data));
    }
  }

  displayResults(results: { type: string, features: SearchResult[] }) {
    // First, group the results
    const groupedResults: Record<string, any[]> = {}
    results.features.forEach(result => {
      const type = result.properties.layer_name;

      if (type in groupedResults) {
        this.resultList = groupedResults[type];
      }
      else {
        this.resultList = [];
        groupedResults[type] = this.resultList;
      }

      this.resultList.push(result);
    });

    // Then, display the results by group
    this.clearSearch();
    for (const type in groupedResults) {

      // Create a title
      const title = document.createElement('div');
      title.className = 'title';

      const icon = document.createElement('i');
      icon.className = this.getIconClassName(type);
      title.appendChild(icon);

      const titleText = document.createElement('span');
      titleText.innerHTML = type; // TODO: Translate `type`
      title.appendChild(titleText);

      this.resultsBox.appendChild(title);

      // Create results
      groupedResults[type].forEach(r => {
        const result = document.createElement('div');
        result.className = 'result';
        this.resultList.push(r.bbox);
        result.dataset.resultId = String(this.resultList.length - 1);

        result.onmousedown = () => { this.ignoreBlur = true };
        result.onclick = (e) => { this.ignoreBlur = false; this.onSelect(e); };

        const text = document.createElement('span');
        text.innerHTML = r.properties.label;
        result.appendChild(text);

        this.resultsBox.appendChild(result);
      });
    }

    this.setSearchBoxHeight(this.initialSearchBoxHeight + this.resultsBox.offsetHeight + 20);
  }

  getIconClassName(type: string) {
    // TODO: Do not hardcode values here
    switch(type) {
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

  setSearchBoxHeight(height: number) {
    this.searchBox.style.height = height + 'px';
  }

  onSelect(e: MouseEvent) {
    const target = e.target as HTMLSpanElement;
    if (target) {
      const div = super.getParentOfType('DIV', target) as HTMLDivElement;
      const resultGeometry = this.resultList[parseInt(div.dataset.resultId!)];

      this.zoomTo(resultGeometry);
      this.onFocusOut();
    }
  }

  zoomTo(extent: Extent) {
    // We create a buffer around the extent from 50% of the width/height
    const bufferValue = Math.max(getWidth(extent)*50/100, getHeight(extent)*50/100);
    const bufferedExtent = buffer(extent, bufferValue);

    this.messageManager.sendMessage({action: GeoEvents.zoomToExtent, extent: bufferedExtent});
  }

  attributeChangedCallback(_name: string, _oldValue: string, _newValue: string, _namespace: string) {
    console.log('attributeChangedCallback');
  }

  convertRemToPixels(rem: number) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }
}

customElements.define('girafe-search', SearchComponent);

export default SearchComponent;
