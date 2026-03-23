// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ThemeLayer from '../../models/layers/themelayer';
import NewIcon from './images/new.svg';
import CustomTheme from '../../models/customtheme';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ThemeTypes = ['all', 'favorites', 'custom'] as const;
type ThemeType = (typeof ThemeTypes)[number];

class ThemeComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  newIcon: string = NewIcon;

  public menuOpen: boolean = false;
  public openedOnce: boolean = false;

  activeThemeType: ThemeType = 'all';

  clickOutsideContainer: HTMLElement | null = null;

  public get customThemes() {
    return this.context.customThemesManager.customThemes;
  }

  public get allThemes() {
    return this.state.themes._allThemes ?? {};
  }

  public get favoriteThemes() {
    return [
      ...Object.values(this.allThemes).filter((theme) => this.context.themeFavoritesManager.isThemeInFavorites(theme)),
      ...Object.values(this.customThemes).filter((theme) =>
        this.context.themeFavoritesManager.isThemeInFavorites(theme)
      )
    ];
  }

  public get activeThemes() {
    switch (this.activeThemeType) {
      case 'all':
        return this.allThemes;
      case 'favorites':
        return this.favoriteThemes;
      case 'custom':
        return this.customThemes;
      default:
        return {};
    }
  }

  public constructor() {
    super('themes');
  }

  registerEvents() {
    this.subscribe('loading', () => this.render());
    this.subscribe('themes.isLoaded', () => {
      if (this.state.themes.isLoaded) {
        this.render();
        super.girafeTranslate();
      }
    });
  }

  protected render() {
    super.render();
    if (this.clickOutsideContainer) this.clickOutsideContainer.style.display = this.menuOpen ? 'block' : 'none';
  }

  onBlur() {
    this.menuOpen = false;
    this.render();
  }

  toggleThemesList() {
    this.openedOnce = true;
    this.menuOpen = !this.menuOpen;
    this.render();
  }

  activateThemeType(themeType: ThemeType) {
    this.activeThemeType = themeType;
    this.render();
  }

  onThemeChanged(theme: ThemeLayer | CustomTheme) {
    if (this.context.configManager.Config.themes.selectionMode === 'add') {
      this.state.themes.lastSelectedTheme = null;
    }
    this.state.themes.lastSelectedTheme = theme;
    if (theme instanceof CustomTheme) return;
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

  isThemeActive(theme: ThemeLayer | CustomTheme) {
    if (this.context.configManager.Config.themes.selectionMode === 'replace') {
      return theme.id === this.state.themes.lastSelectedTheme?.id;
    }
    return this.state.layers.layersList.some((layer) => layer instanceof ThemeLayer && layer.id === theme.id);
  }

  isThemeFavorite(theme: ThemeLayer | CustomTheme) {
    return this.context.themeFavoritesManager.isThemeInFavorites(theme);
  }

  onThemeFavoriteChanged(theme: ThemeLayer | CustomTheme, e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.context.themeFavoritesManager.addOrRemoveThemeFromFavorites(theme);
    this.render();
  }

  isThemeTypeActive(themeType: ThemeType) {
    return (this.activeThemeType ?? 'all') === themeType;
  }

  isCustomTheme(theme: ThemeLayer | CustomTheme) {
    return theme instanceof CustomTheme;
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
      this.render();
    }
  }

  async onDeleteCustomTheme(customTheme: CustomTheme, e: Event) {
    e.stopPropagation();
    const confirm = await window.gConfirm('Do you want to delete this theme?', 'Delete Theme');
    if (confirm) {
      this.context.customThemesManager.deleteTheme(customTheme);
      this.render();
    }
  }

  protected override connectedCallback() {
    super.connectedCallback();
    super.render();
    this.registerEvents();
    this.girafeTranslate();
    this.clickOutsideContainer = this.shadow.getElementById('close-themes-menu');
  }
}

export default ThemeComponent;
