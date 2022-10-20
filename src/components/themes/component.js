import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class ThemeComponent extends GirafeHTMLElement {

  static #template = null;
  themesSelect = null;
  themesUrl = null;
  themesJson = {};
  themes = [];
  
  constructor() {
    super();
    this.themesUrl = this.getAttribute('themes');
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (ThemeComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/themes/template.html');
    const content = await response.text();
    ThemeComponent.#template = document.createElement('template');
    ThemeComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(ThemeComponent.#template.content.cloneNode(true));

    this.themesSelect = this.shadow.querySelector('#themes');

    // Add options from themes
    this.themesJson.forEach(elem => {
      this.addOption(this.themesSelect, elem);
    });
  }

  addOption(select, theme) {
    // Create new theme option
    const option = document.createElement('option');
    option.innerHTML = theme.name;

    this.themes.push(theme);
    option.value = this.themes.length - 1;
  
    // Add to select
    select.appendChild(option);
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    this.themesSelect.addEventListener('change', (e) => this.onThemeChanged(this, e));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      if (details.state.theme !== 'null') {
        // Find the theme id from the name
        const index = this.themes.findIndex(item => item.name === details.state.theme);
        this.themesSelect.value = index;
        this.messageManager.sendMessage(GeoEvents.Theme, {action: 'themeChanged', theme: this.themes[index]});
      }
    }
  }

  onThemeChanged(_this, e) {
    this.messageManager.sendMessage(GeoEvents.Theme, {action: 'themeChanged', theme: _this.themes[e.target.value]});
  }

  connectedCallback() {
    this.loadTemplate()
    .then(() => this.loadThemes()
      .then(() => {
        this.render();
        this.registerEvents();
        this.initialized();
    }));
  }

  initialized() {
    this.messageManager.sendMessage(GeoEvents.Init, {action: 'componentInitialized'});
  }  

  async loadThemes() {
    const response = await fetch(this.themesUrl);
    const content = await response.json();
    this.themesJson = content["themes"];
  }
}

customElements.define('girafe-theme-select', ThemeComponent);

export default ThemeComponent;
