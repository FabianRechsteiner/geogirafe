import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import type CustomTheme from '../../../models/customtheme';
import type ThemeLayer from '../../../models/layers/themelayer';

export default class ThemeListItemMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];
  public theme!: ThemeLayer | CustomTheme;
  public isActive = false;

  constructor() {
    super('theme-list-element-mobile');
  }

  activate() {
    this.state.themes.lastSelectedTheme = this.theme;
  }

  connectedCallback() {
    super.connectedCallback();
    this.subscribe('themes.isLoaded', () => {
      const themes = Object.values(this.state.themes._allThemes);
      const themeIdStr = this.getAttribute('themeid');

      if (!themeIdStr) {
        return;
      }

      const themeId = Number.parseInt(themeIdStr);
      const candidateThemes = themes.filter((t) => t.id === themeId);

      if (candidateThemes.length === 0) {
        return;
      }

      this.theme = candidateThemes[0];
      this.isActive =
        this.state.themes.lastSelectedTheme !== null && this.state.themes.lastSelectedTheme.id === this.theme.id;

      this.render();

      const container = this.shadow.getElementById('theme-container') as HTMLDivElement;
      container.style.setProperty('background-image', `url(${this.theme.icon})`);

      this.render();
    });

    this.subscribe('themes.lastSelectedTheme', () => {
      this.isActive =
        this.theme !== null &&
        this.state.themes.lastSelectedTheme !== null &&
        this.state.themes.lastSelectedTheme.id === this.theme.id;
      this.render();
    });
  }
}
