import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Basemap from '../../models/basemap';
import ShareManager from '../../tools/share/sharemanager';

class BasemapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  servers = {};
  basemapJson = {};

  shareManager: ShareManager;

  activeBasemap: string = '';

  constructor() {
    super('basemap');

    this.shareManager = ShareManager.getInstance();

    this.configManager.loadConfig().then(() => {
      if (!this.configManager.Config.basemaps.show) {
        this.hide();
      }
    });
  }

  onBasemapsLoaded(basemaps: { [key: number]: Basemap }) {
    super.render();

    // Configure default basemap (only if there is no sharedstate)
    if (!this.shareManager.hasSharedState()) {
      for (const basemap of Object.values(basemaps)) {
        if (basemap.name === this.configManager.Config.basemaps.defaultBasemap) {
          this.state.activeBasemap = basemap;
          this.activeBasemap = basemap.name;
          this.render();
          break;
        }
      }
    }
  }

  changeBasemap(basemap: Basemap) {
    console.log('change basemap', basemap);
    if (basemap.projection) {
      this.state.projection = basemap.projection;
    }
    this.state.activeBasemap = basemap;
    this.activeBasemap = basemap.name;
    this.render();
  }

  registerEvents() {
    this.subscribe('basemaps', (_oldBasemaps: { [key: number]: Basemap }, newBasemaps: { [key: number]: Basemap }) =>
      this.onBasemapsLoaded(newBasemaps)
    );
    this.subscribe('activeBasemap', (_oldBasemap: Basemap, newBasemap: Basemap) => this.changeBasemap(newBasemap));
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

export default BasemapComponent;
