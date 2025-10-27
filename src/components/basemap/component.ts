import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Basemap from '../../models/basemaps/basemap';

class BasemapComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  constructor() {
    super('basemap');
  }

  private changeBasemap(basemap: Basemap) {
    this.state.projection = basemap.projection ?? this.context.configManager.Config.map.srid;
    this.state.activeBasemap = basemap;
    this.refreshRender();
  }

  toggleVisibility(visible: boolean) {
    (this.shadowRoot?.host as HTMLElement).style.display = visible ? 'block' : 'none';
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
    this.subscribe('interface.basemapComponentVisible', (_oldValue: boolean, newValue: boolean) =>
      this.toggleVisibility(newValue)
    );
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.context.configManager.Config.basemaps.show && this.state.interface.basemapComponentVisible) {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    } else {
      this.state.interface.basemapComponentVisible = false;
      this.renderEmpty();
    }
  }
}

export default BasemapComponent;
