import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ThemeLayer from '../../models/layers/themelayer';
import MapManager from '../../tools/state/mapManager';
import NewIcon from './images/new.svg';
import CustomTheme from '../../models/customtheme';
import CustomThemesManager from '../../tools/themes/customthemesmanager';

class ThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  newIcon: string = NewIcon;

  private readonly mapManager: MapManager;
  private readonly customThemesManager: CustomThemesManager;
  public menuOpen: boolean = false;
  public openedOnce: boolean = false;

  public get customThemes() {
    return this.customThemesManager.customThemes;
  }

  constructor() {
    super('themes');
    this.mapManager = MapManager.getInstance();
    this.customThemesManager = CustomThemesManager.getInstance();
  }

  registerEvents() {
    this.subscribe('loading', () => super.render());
    this.subscribe('themes.isLoaded', () => {
      if (this.state.themes.isLoaded) {
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

  async onAddCustomTheme() {
    const themeName = await window.gPrompt(
      'Please enter a name for the new custom theme',
      'Create cutsom theme',
      'my theme'
    );
    if (themeName !== false && themeName.trim().length > 0) {
      this.customThemesManager.addTheme(themeName, this.state.layers.layersList);
      super.render();
    }
  }

  async onDeleteCustomTheme(themelayer: CustomTheme, e: Event) {
    e.stopPropagation();
    const confirm = await window.gConfirm('Do you want to delete this theme?', 'Delete Theme');
    if (confirm) {
      this.customThemesManager.deleteTheme(themelayer);
      super.render();
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      this.registerEvents();
      this.activateTooltips(false, [800, 0], 'top');
      this.girafeTranslate();
    });
  }
}

export default ThemeComponent;
