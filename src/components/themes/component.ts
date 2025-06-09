import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ThemeLayer from '../../models/layers/themelayer';
import Theme from '../../models/theme';
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
    if (theme.disclaimer) {
      this.state.infobox.elements.push({
        id: theme.treeItemId,
        text: theme.disclaimer,
        type: 'info'
      });
    }
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

  isThemeActive(theme: Theme) {
    return theme.id === this.state.themes.lastSelectedTheme?.id;
  }

  onCustomThemeChanged(customTheme: CustomTheme) {
    this.state.themes.lastSelectedTheme = customTheme;
    this.onBlur();
  }

  async onAddCustomTheme() {
    const themeName = await window.gPrompt(
      'Enter a name for your custom theme',
      'Create custom theme',
      'Enter a name...'
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
      this.girafeTranslate();
    });
  }
}

export default ThemeComponent;
