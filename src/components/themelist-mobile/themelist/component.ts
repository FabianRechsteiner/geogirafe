import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import type ThemeLayer from '../../../models/layers/themelayer';

export default class ThemeListMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];
  public themes: ThemeLayer[] = [];
  public collapsed = true;

  constructor() {
    super('theme-list-mobile');
  }

  connectedCallback() {
    (async () => {
      await this.loadConfig();
      this.render();

      this.subscribe('themes.isLoaded', () => {
        this.themes = Object.values(this.state.themes._allThemes);
        this.render();

        // This is to initialize the "height" CSS prop so it actually anmates the first time
        const grid = this.shadow.querySelector('.grid') as HTMLDivElement;
        grid.style.setProperty('max-height', this.collapsed ? '0px' : `${grid.scrollHeight}px`);
      });

      this.subscribe('themes.lastSelectedTheme', () => {
        this.collapse();
        this.refreshRender();
      });

      // Toggle to dark mode when needed
      this.subscribe('interface.darkFrontendMode', (_waDarkMode: boolean, isDarkMode: boolean) => {
        const container = this.shadow.querySelector('.title-container') as HTMLDivElement;

        if (isDarkMode) {
          container.classList.add('dark-mode');
        } else {
          container.classList.remove('dark-mode');
        }
      });
    })();
  }

  toggleCollapse(e: PointerEvent) {
    e.stopPropagation();

    if (this.collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  collapse() {
    const grid = this.shadow.querySelector('.grid') as HTMLDivElement;
    grid.style.setProperty('max-height', '0px');
    this.collapsed = true;
    this.render();
  }

  expand() {
    const grid = this.shadow.querySelector('.grid') as HTMLDivElement;
    grid.style.setProperty('max-height', `${grid.scrollHeight}px`);
    this.collapsed = false;
    this.render();
  }
}
