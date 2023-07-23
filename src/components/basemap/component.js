import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class BasemapComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  servers = {};
  basemapJson = {};
  basemaps = [];
  
  constructor() {
    super('basemap');

    this.configManager.loadConfig().then(() => { 
      if (!this.configManager.Config.basemaps.show) {
        this.hide();
      }
    });
  }

  render() {
    super.render();
  }

  onBasemapsLoaded(basemaps) {
    super.render();

    // Configure default basemap
    for (const basemap of Object.values(basemaps)) {
      if (basemap.name === this.configManager.Config.basemaps.defaultBasemap) {
        this.state.activeBasemap = basemap;
        break;
      }
    }
  }

  changeBasemap(basemap) {
    if (!this.isNullOrUndefined(basemap.projection)) {
      this.state.projection = basemap.projection;
    }
    this.state.activeBasemap = basemap;
  }

  registerEvents() {
    this.stateManager.subscribe('basemaps', (oldBasemaps, newBasemaps) => this.onBasemapsLoaded(newBasemaps));
    this.stateManager.subscribe('olMap', (oldMap, newMap) => this.test(newMap));
  }

  test(map) {
    console.log('toto');
  }

  connectedCallback() {
    this.loadConfig()
      .then(() => {
        this.render();
        super.girafeTranslate();
        this.registerEvents();
    });
  }
}

customElements.define('girafe-basemap', BasemapComponent);

export default BasemapComponent;
