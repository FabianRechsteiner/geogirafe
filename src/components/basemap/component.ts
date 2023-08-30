import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Basemap from '../../models/basemap';

class BasemapComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  servers = {};
  basemapJson = {};

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

  onBasemapsLoaded(basemaps: {[key: number]: Basemap}) {
    super.render();

    // Configure default basemap
    for (const basemap of Object.values(basemaps)) {
      if (basemap.name === this.configManager.Config.basemaps.defaultBasemap) {
        this.state.activeBasemap = basemap;
        break;
      }
    }
  }

  changeBasemap(basemap: Basemap) {
    console.log('change basemap', basemap);
    if (basemap.projection) {
      this.state.projection = basemap.projection;
    }
    this.state.activeBasemap = basemap;
  }

  registerEvents() {
    this.stateManager.subscribe('basemaps', (_oldBasemaps: {[key: number]: Basemap}, newBasemaps: {[key: number]: Basemap}) => this.onBasemapsLoaded(newBasemaps));
    this.stateManager.subscribe('olMap', (_oldMap: Basemap, newMap: Basemap) => this.testBasemap(newMap));
  }

  testBasemap(map: Basemap) {
    console.log('test basemap', map);
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
