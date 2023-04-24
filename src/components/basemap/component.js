import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ButtonComponent from '../button/component.js';

class BasemapComponent extends GirafeHTMLElement {

  servers = {};
  basemapJson = {};
  basemaps = [];
  container = null;
  
  constructor() {
    super('basemap');
  }

  render() {
    super.render();
    this.container = this.shadow.querySelector('#container');
  }

  onBasemapsLoaded(basemaps) {
    let defaultBasemap = null;
    Object.values(basemaps).forEach(basemap => {
      this.createButton(basemap);
      if (basemap.name === this.configManager.Config.themes.defaultBasemap) {
        defaultBasemap = basemap;
      }
    });

    if (!this.isNullOrUndefined(defaultBasemap)) {
      this.state.activeBasemap = defaultBasemap;
    }
  }

  createButton(basemap) {
    const button = new ButtonComponent();
    button.setAttribute('text', basemap.name);
    button.setAttribute('size', 'large');
    button.classList.add('border-top');
    button.onClick = () => {
      if (!this.isNullOrUndefined(basemap.projection)) {
        this.state.projection = basemap.projection;
      }
      this.state.activeBasemap = basemap;
    }
    this.container.appendChild(button);
  }

  registerEvents() {
    this.stateManager.subscribe('basemaps', (oldBasemaps, newBasemaps) => this.onBasemapsLoaded(newBasemaps));
  }

  connectedCallback() {
    this.loadTemplate()
      .then(() => {
        this.render();
        super.translate();
        this.registerEvents();
    });
  }
}

customElements.define('girafe-basemap', BasemapComponent);

export default BasemapComponent;
