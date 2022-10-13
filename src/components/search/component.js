import GirafeHTMLElement from '/base/GirafeHTMLElement';

class SearchComponent extends GirafeHTMLElement {

  static #template = null;
  searchUrl = null;
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
    const searchBox = this.shadow.querySelector('#searchbox');
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    const searchbox = this.shadow.querySelector('#search');
    searchbox.addEventListener('input', (e) => this.doSearch(this, e));
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  clearSearch() {
    const resultsBox = this.shadow.querySelector('#results');
    resultsBox.innerHTML = '';
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
    this.clearSearch();
    if (results.length === 0)
      return;

    const resultsBox = this.shadow.querySelector('#results');
    results.forEach(result => {
      const span = document.createElement(`span`);
      span.textContent = result.label;
      span.className = 'result';
      span.style.cursor = 'pointer';
      span.onclick = (e) => this.onSelect(e);
      resultsBox.appendChild(span);
    });
    this.setSearchBoxHeight(this.initialSearchBoxHeight + resultsBox.offsetHeight + 20);
  }

  setSearchBoxHeight(height) {
    const searchBox = this.shadow.querySelector('#searchbox');
    searchBox.style.height = height + 'px';
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
