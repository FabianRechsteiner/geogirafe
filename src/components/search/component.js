class SearchComponent extends HTMLElement {

  static #template = null;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.registerEvents();
  }

  registerEvents() {
    //window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
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

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
    });
  }

  attributeChangedCallback(name, oldValue, newValue, namespace) {
    console.log('attributeChangedCallback');
  }
}

customElements.define('girafe-search', SearchComponent);
