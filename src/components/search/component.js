import GirafeHTMLElement from '/base/GirafeHTMLElement';

class SearchComponent extends GirafeHTMLElement {

  static #template = null;
  searchUrl = null;
  searchBox = null;
  resultsBox = null;
  ignoreBlur = false;

  searchTermPlaceholder = '###SEARCHTERM###';
  initialSearchBoxHeight = this.convertRemToPixels(2.5);
  
  constructor() {
    super();
    this.searchUrl = this.getAttribute('search-url');
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (SearchComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/search/template.html');
    const content = await response.text();
    SearchComponent.#template = document.createElement('template');
    SearchComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(SearchComponent.#template.content.cloneNode(true));

    // Get default height of searchBox
    this.searchBox = this.shadow.querySelector('#searchbox');
    this.resultsBox = this.shadow.querySelector('#results');
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    this.searchBox.addEventListener('input', (e) => this.doSearch(this, e));
    this.searchBox.addEventListener('focusin', (e) => this.onFocusIn(e));
    this.searchBox.addEventListener('focusout', (e) => this.onFocusOut(e));
  }

  onFocusIn(e) {
    this.ignoreBlur = false;
    this.resultsBox.style.display = 'block';
    this.setSearchBoxHeight(this.initialSearchBoxHeight + this.resultsBox.offsetHeight + 20);
  }

  onFocusOut(e) {
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
        result.onmousedown = () => { this.ignoreBlur = true };
        result.onclick = (e) => { this.ignoreBlur = false; alert(e); };
    

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
