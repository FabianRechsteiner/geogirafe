import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ThemeLayer from '../../models/layers/themelayer';
import MapManager from '../../tools/state/mapManager';
import NewIcon from './images/new.svg';
import CustomTheme from './tools/customtheme';
import CustomThemesManager from './tools/customthemesmanager';

class ThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../styles/common.css'];

  newIcon: string = NewIcon;

  private readonly mapManager: MapManager;
  private readonly customThemesManager = new CustomThemesManager();
  public menuOpen: boolean = false;
  public openedOnce: boolean = false;

  public get customThemes() {
    return this.customThemesManager?.customThemes ?? [];
  }

  constructor() {
    super('themes');
    this.mapManager = MapManager.getInstance();
  }

  registerEvents() {
    this.subscribe('loading', () => super.render());
    this.subscribe('themes.isLoaded', () => {
      if (this.state.themes.isLoaded) {
        this.customThemesManager.loadCustomThemes();
        super.render();
        super.girafeTranslate();
      }
    });
  }

  onBlur() {
    this.menuOpen = false;
    super.render();
  }

  toggleThemesList() {
    this.openedOnce = true;
    this.menuOpen = !this.menuOpen;
    super.render();
  }

  onThemeChanged(theme: ThemeLayer) {
    this.state.themes.lastSelectedTheme = theme;
    this.onBlur();

    if (theme.location != null || theme.zoom != null) {
      const view = this.mapManager.getMap().getView();
      view.animate({
        center: theme.location ?? view.getCenter(),
        zoom: theme.zoom ?? view.getZoom(),
        duration: 1000
      });
    }
  }

  onCustomThemeChanged(customTheme: CustomTheme) {
    if (customTheme.hasThemes) {
      for (let i = customTheme.layers.length - 1; i >= 0; --i) {
        const theme = customTheme.layers[i];
        if (theme instanceof ThemeLayer) {
          this.state.themes.lastSelectedTheme = theme;
        } else {
          throw new Error('There is an error in the custom');
        }
      }
    } else {
      this.state.themes.lastSelectedTheme = customTheme.getThemeLayer();
    }
  }

  onAddCustomTheme() {
    const themeName = prompt('Please give a name to you new custom theme:');
    if (themeName !== null && themeName.trim().length > 0) {
      this.customThemesManager.addTheme(themeName, this.state.layers.layersList);
      super.render();
    }
  }

  onDeleteCustomTheme(themelayer: CustomTheme, e: Event) {
    e.stopPropagation();
    if (confirm('Do you want to delete this theme?')) {
      this.customThemesManager.deleteTheme(themelayer);
      super.render();
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      this.activateTooltips(false, [800, 0], 'top');
      this.registerEvents();
    });
  }
}

export default ThemeComponent;
