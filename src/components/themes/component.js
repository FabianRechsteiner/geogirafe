import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class ThemeComponent extends GirafeHTMLElement {

  static #template = null;
  themesButton = null;
  layerIcon = null;
  waitingIcon = null;
  themesList = null;
  themesUrl = null;
  themesJson = {};
  themes = [];
  ignoreBlur = false;
  
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

    this.themesButton = this.shadow.querySelector('#select');
    this.themesButton.onclick = () => this.toggleThemesList();
    this.themesButton.onblur =  () => this.onBlur();

    this.layerIcon = this.shadow.querySelector('#icon');
    this.waitingIcon = this.shadow.querySelector('#waiting');

    this.themesList = this.shadow.querySelector('#themes');
    this.toggleThemesList(false);

    // Add options from themes
    this.themesJson.forEach(elem => {
      this.addOption(this.themesList, elem);
    });
  }

  onBlur() {
    if (!this.ignoreBlur) {
      this.toggleThemesList(false);
    }
  }

  toggleThemesList(forceDisplay=null) {
    if (forceDisplay === true) {
      this.themesList.style.display = 'block';
    }
    else if (forceDisplay === false) {
      this.themesList.style.display = 'none';
    }
    
    else if (this.themesList.style.display === 'none') {
      this.themesList.style.display = 'block';
    }
    else {
      this.themesList.style.display = 'none';
    }
  }

  addOption(select, theme) {
    // Create new theme option
    const option = document.createElement('div');

    const img = document.createElement('img');
    img.src = theme.icon;
    option.appendChild(img);

    const span = document.createElement('span');
    span.innerHTML = theme.name;
    option.appendChild(span);

    this.themes.push(theme);
    option.dataset['value'] = this.themes.length - 1;
    // Ignore blur on mouse down to prevent themes from de-rendering before we can process click
    option.onmousedown = () => { this.ignoreBlur = true };
    option.onclick = (e) => this.onThemeChanged(e);
  
    // Add to select
    select.appendChild(option);
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Init, (e) => this.onInitEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
    //this.themesList.addEventListener('change', (e) => this.onThemeChanged(this, e));
  }

  onInitEvent(details) {
    if (details.action === 'initState') {
      if (details.state.theme !== 'null') {
        // Find the theme id from the name
        //const index = this.themes.findIndex(item => item.name === details.state.theme);
        //this.themesList.value = index;
        //this.messageManager.sendMessage(GeoEvents.Theme, {action: 'themeChanged', theme: this.themes[index]});
      }
    }
  }

  onMapEvent(details) {
    if (details.action === 'renderStarted') {
      this.layerIcon.style.display = 'none';
      this.waitingIcon.style.display = 'block';
    }
    else if (details.action === 'renderEnded') {
      this.layerIcon.style.display = 'block';
      this.waitingIcon.style.display = 'none';
    }
  }

  onThemeChanged(e) {
    const div = this.getParentDiv(e.target);
    const index = div.dataset["value"];
    this.messageManager.sendMessage(GeoEvents.Theme, {action: 'themeChanged', theme: this.themes[index]});
    this.toggleThemesList(false);
    this.ignoreBlur = false;
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

  getParentDiv(elem) {
    if (elem.nodeName === 'DIV') {
      return elem;
    }

    return this.getParentDiv(elem.parentElement);
  }
}

customElements.define('girafe-theme-select', ThemeComponent);

export default ThemeComponent;
