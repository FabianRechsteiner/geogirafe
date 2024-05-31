import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import Theme from '../../models/theme';
import MapManager from '../../tools/state/mapManager';
import NewIcon from './images/new.svg';
import CustomThemesManager from './tools/customthemesmanager';

class ThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  newIcon: string = NewIcon;

  private readonly mapManager: MapManager;
  private customThemesManager?: CustomThemesManager;
  public menuOpen: boolean = false;

  public get customThemes() {
    return this.customThemesManager?.customThemes ?? [];
  }

  constructor() {
    super('themes');
    this.mapManager = MapManager.getInstance();
  }

  registerEvents() {
    this.stateManager.subscribe('loading', () => super.render());
    this.stateManager.subscribe('themes', () => {
      const startThemesId = Math.max(...Object.values(this.state.themes).map((t) => t.id)) + 1;
      this.customThemesManager = new CustomThemesManager(startThemesId);
      this.customThemesManager.loadCustomThemes();
      super.render();
      super.girafeTranslate();
    });
  }

  onBlur() {
    this.menuOpen = false;
    super.render();
  }

  toggleThemesList() {
    this.menuOpen = !this.menuOpen;
    super.render();
  }

  onThemeChanged(theme: Theme) {
    this.state.selectedTheme = theme;
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

  onAddCustomTheme() {
    const themeName = prompt('Please give a name to you new custom theme:');
    if (themeName !== null && themeName.trim().length > 0) {
      this.customThemesManager!.addTheme(themeName, this.state.layers.layersList);
      super.render();
    }
  }

  onDeleteTheme(theme: Theme, e: Event) {
    e.stopPropagation();
    if (confirm('Do you want to delete this theme?')) {
      this.customThemesManager!.deleteTheme(theme);
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
