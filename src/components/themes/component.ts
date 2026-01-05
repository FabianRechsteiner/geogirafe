import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ThemeLayer from '../../models/layers/themelayer';
import Theme from '../../models/theme';
import NewIcon from './images/new.svg';
import CustomTheme from '../../models/customtheme';

class ThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  newIcon: string = NewIcon;

  public menuOpen: boolean = false;
  public openedOnce: boolean = false;

  public get customThemes() {
    return this.context.customThemesManager.customThemes;
  }

  public constructor() {
    super('themes');
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
      const view = this.context.mapManager.getMap().getView();
      view.animate({
        center: theme.location ?? view.getCenter(),
        zoom: theme.zoom ?? view.getZoom(),
        duration: 1000
      });
    }
  }

  isThemeActive(theme: Theme) {
    if (this.context.configManager.Config.themes.selectionMode === 'replace') {
      return theme.id === this.state.themes.lastSelectedTheme?.id;
    }
    return false;
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
      this.context.customThemesManager.addTheme(themeName, this.state.layers.layersList);
      super.render();
    }
  }

  async onDeleteCustomTheme(themelayer: CustomTheme, e: Event) {
    e.stopPropagation();
    const confirm = await window.gConfirm('Do you want to delete this theme?', 'Delete Theme');
    if (confirm) {
      this.context.customThemesManager.deleteTheme(themelayer);
      super.render();
    }
  }

  protected override connectedCallback() {
    super.connectedCallback();
    super.render();
    this.registerEvents();
    this.girafeTranslate();
  }
}

export default ThemeComponent;
