import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class ThemeComponent extends GirafeHTMLElement {

  static #template = null;
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

    const select = this.shadow.querySelector('#themes');

    // Add options from themes
    this.themesJson.forEach(elem => {
      this.addOption(select, elem);
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
    //window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    const themeSelect = this.shadow.querySelector('#themes');
    themeSelect.addEventListener('change', (e) => this.onThemeChanged(this, e));
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
    }));
  }

  async loadThemes() {
    const response = await fetch(this.themesUrl);
    const content = await response.json();
    this.themesJson = content["themes"];
  }
}

customElements.define('girafe-theme-select', ThemeComponent);

export default ThemeComponent;
