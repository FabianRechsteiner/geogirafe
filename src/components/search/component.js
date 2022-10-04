class SearchComponent extends HTMLElement {

  static #template = null;
  searchUrl = null;
  searchTermPlaceholder = '###SEARCHTERM###';
  
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

  doSearch(_this, e) {
    const term = e.target.value;
    if (term.length <= 0)
      return;

    const url = _this.searchUrl.replace(_this.searchTermPlaceholder, term);
    fetch(url)
      .then(response => response.json())
      .then(data => console.log(data));
  }

  attributeChangedCallback(name, oldValue, newValue, namespace) {
    console.log('attributeChangedCallback');
  }
}

customElements.define('girafe-search', SearchComponent);
