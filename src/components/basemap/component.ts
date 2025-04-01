import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Basemap from '../../models/basemap';
import ShareManager from '../../tools/share/sharemanager';

class BasemapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  shareManager: ShareManager;

  activeBasemapName: string = '';

  constructor() {
    super('basemap');

    this.shareManager = ShareManager.getInstance();
  }

  onBasemapsLoaded(basemaps: { [key: number]: Basemap }) {
    this.render();

    // Configure default basemap (only if there is no sharedstate)
    if (!this.shareManager.hasSharedState()) {
      for (const basemap of Object.values(basemaps)) {
        if (basemap.name === this.configManager.Config.basemaps.defaultBasemap) {
          this.state.activeBasemap = basemap;
          this.activeBasemapName = basemap.name;
          this.render();
          break;
        }
      }
    }
  }

  changeBasemap(basemap: Basemap) {
    if (basemap.id === this.state.activeBasemap?.id && this.activeBasemapName === basemap.name) {
      return;
    }
    if (basemap.projection) {
      this.state.projection = basemap.projection;
    }
    this.state.activeBasemap = basemap;
    this.activeBasemapName = basemap.name;
    this.refreshRender();
  }

  registerEvents() {
    this.subscribe('basemaps', (_oldBasemaps: { [key: number]: Basemap }, newBasemaps: { [key: number]: Basemap }) =>
      this.onBasemapsLoaded(newBasemaps)
    );
    this.subscribe('activeBasemap', (_oldBasemap: Basemap, newBasemap: Basemap) => this.changeBasemap(newBasemap));
    this.subscribe('themes.isLoaded', () => {
      if (this.state.themes.isLoaded) {
        if (Object.keys(this.state.basemaps).length === 0) {
          this.renderEmpty();
        }
      }
    });
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      if (this.configManager.Config.basemaps.show) {
        this.render();
        super.girafeTranslate();
        this.registerEvents();
      } else {
        this.renderEmpty();
      }
    });
  }
}

export default BasemapComponent;
