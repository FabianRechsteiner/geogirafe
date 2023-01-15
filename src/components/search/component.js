import Polygon from 'ol/geom/Polygon';
import {buffer, getWidth, getHeight} from 'ol/extent';

import GirafeHTMLElement from '/base/GirafeHTMLElement';
import GeoEvents from '/models/events.js';

class SearchComponent extends GirafeHTMLElement {

  searchUrl = null;
  searchBox = null;
  resultsBox = null;
  ignoreBlur = false;

  resultList = null;

  searchTermPlaceholder = '###SEARCHTERM###';
  initialSearchBoxHeight = this.convertRemToPixels(2.5);
  
  constructor() {
    super('search');
    this.searchUrl = this.getAttribute('search-url');
  }

  render() {
    super.render();

    // Get default height of searchBox
    this.searchBox = this.shadow.querySelector('#searchbox');
    this.resultsBox = this.shadow.querySelector('#results');
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    this.searchBox.addEventListener('input', (e) => this.doSearch(this, e));
    this.searchBox.addEventListener('focusin', (e) => this.onFocusIn());
    this.searchBox.addEventListener('focusout', (e) => this.onFocusOut());
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
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  clearSearch() {
    this.resultList = [];
    this.resultsBox.innerHTML = '';
    this.setSearchBoxHeight(this.initialSearchBoxHeight);
  }

  doSearch(_this, e) {
    const term = e.target.value;
    if (term.length <= 0) {
      this.clearSearch();
      return;
    }

    const url = _this.searchUrl.replace(_this.searchTermPlaceholder, term);
    fetch(url)
      .then(response => response.json())
      .then(data => this.displayResults(data));
  }

  displayResults(results) {

    // First, group the results
    const groupedResults = {}
    results.features.forEach(result => {
      const type = result.properties.layer_name;

      let resultList = null;
      if (type in groupedResults) {
        resultList = groupedResults[type];
      }
      else {
        resultList = [];
        groupedResults[type] = resultList;
      }

      resultList.push(result);
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
      titleText.innerHTML = type;
      title.appendChild(titleText);

      this.resultsBox.appendChild(title);

      // Create results
      groupedResults[type].forEach(r => {
        const result = document.createElement('div');
        result.className = 'result';
        this.resultList.push(r.geometry);
        result.dataset.resultId = this.resultList.length - 1;

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

  getIconClassName(type) {
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

  setSearchBoxHeight(height) {
    this.searchBox.style.height = height + 'px';
  }

  onSelect(e) {
    console.log(e.target.innerHTML);
    const div = super.getParentOfType('DIV', e.target);
    const resultGeometry = this.resultList[div.dataset.resultId];
    if (resultGeometry.type === 'Point') {
      this.messageManager.sendMessage(GeoEvents.Map, {action: 'panToCoordinate', coordinate: resultGeometry.coordinates });
      this.onFocusOut();
    }
    else if (resultGeometry.type === 'Polygon') {
      this.zoomTo(resultGeometry.coordinates);
      this.onFocusOut();
    }
    else {
      alert('Result-Type not managed yet');
    }
  }

  zoomTo(coordinates) {
    const extent = new Polygon(coordinates).getExtent();
    // We create a buffer around the extent from 50% of the width/height
    const bufferValue = parseInt(Math.max(getWidth(extent)*50/100, getHeight(extent)*50/100));
    const bufferedExtent = buffer(extent, bufferValue);

    this.messageManager.sendMessage(GeoEvents.Map, {action: 'zoomToExtent', extent: bufferedExtent });
  }

  attributeChangedCallback(name, oldValue, newValue, namespace) {
    console.log('attributeChangedCallback');
  }

  convertRemToPixels(rem) {    
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }
}

customElements.define('girafe-search', SearchComponent);

export default SearchComponent;
