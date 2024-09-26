import Basemap from '../../models/basemap';
import ShareManager from '../../tools/share/sharemanager';
import Layer from '../../models/layers/layer';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MapManager from '../../tools/state/mapManager';
import ThemeLayer from '../../models/layers/themelayer';
import LayerManager from '../../tools/layermanager';
import BaseLayer from '../../models/layers/baselayer';

class MobileThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  public showBasemaps: boolean = true;
  public menuOpen: boolean = false;
  private preventBlur: boolean = false;

  constructor() {
    super('themes-mobile');

    this.configManager.loadConfig().then(() => {
      this.showBasemaps = this.configManager.Config.basemaps.show;
    });
  }

  toggleThemesList() {
    this.menuOpen = !this.menuOpen;
    super.render();
  }

  onBlur() {
    if (!this.preventBlur) {
      this.menuOpen = false;
      super.render();
    }
  }

  mouseUp() {
    this.preventBlur = false;
  }

  onThemeChanged(theme: ThemeLayer) {
    this.preventBlur = true;
    this.state.themes.lastSelectedTheme = theme;

    if (theme.location != null || theme.zoom != null) {
      const view = MapManager.getInstance().getMap().getView();
      view.animate({
        center: theme.location ?? view.getCenter(),
        zoom: theme.zoom ?? view.getZoom(),
        duration: 1000
      });
    }
  }

  onLayerSelected(layer: BaseLayer) {
    this.preventBlur = true;
    if (layer instanceof Layer) {
      LayerManager.getInstance().toggleLayer(layer);
      this.render();
    } else {
      console.warn('This method should only be called for layers, not groups.');
    }
  }

  onBasemapsLoaded(basemaps: { [key: number]: Basemap }) {
    super.render();

    // Configure default basemap (only if there is no sharedstate)
    if (!ShareManager.getInstance().hasSharedState()) {
      for (const basemap of Object.values(basemaps)) {
        if (basemap.name === this.configManager.Config.basemaps.defaultBasemap) {
          this.state.activeBasemap = basemap;
          break;
        }
      }
    }
  }

  changeBasemap(basemap: Basemap) {
    this.preventBlur = true;
    if (basemap.projection) {
      this.state.projection = basemap.projection;
    }
    this.state.activeBasemap = basemap;
  }

  registerEvents() {
    this.subscribe('themes', () => {
      super.render();
      super.girafeTranslate();
    });
    this.subscribe('layers.layersList', () => {
      for (const layer of this.state.layers.layersList) {
        LayerManager.getInstance().activateIfDefaultChecked(layer);
      }
      super.render();
      super.girafeTranslate();
    });

    this.subscribe('basemaps', (_oldBasemaps: { [key: number]: Basemap }, newBasemaps: { [key: number]: Basemap }) =>
      this.onBasemapsLoaded(newBasemaps)
    );
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      this.registerEvents();
    });
  }
}

export default MobileThemeComponent;
