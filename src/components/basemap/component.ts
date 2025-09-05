import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Basemap from '../../models/basemaps/basemap';

class BasemapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  constructor() {
    super('basemap');
  }

  private changeBasemap(basemap: Basemap) {
    if (basemap.projection) {
      this.state.projection = basemap.projection;
    }
    this.state.activeBasemap = basemap;
    this.refreshRender();
  }

  registerEvents() {
    this.subscribe('basemaps', () => this.render());
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
