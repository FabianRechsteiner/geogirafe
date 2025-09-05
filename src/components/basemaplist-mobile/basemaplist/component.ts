import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import type Basemap from '../../../models/basemaps/basemap';

export default class BasemapListMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];
  public basemaps: Basemap[] = [];
  public collapsed = true;

  constructor() {
    super('basemap-list-mobile');
  }

  connectedCallback() {
    this.render();

    this.loadConfig().then(() => {
      this.subscribe('basemaps', (_oldValue: Record<number, Basemap>, newValue: Record<number, Basemap>) => {
        this.basemaps = Object.values(newValue).filter((b) => b.layersList.length);
        this.render();

        // This is to initialize the "height" CSS prop so it actually anmates the first time
        const grid = this.shadow.querySelector('.grid') as HTMLDivElement;
        grid.style.setProperty('max-height', this.collapsed ? '0px' : `${grid.scrollHeight}px`);
      });

      this.subscribe('activeBasemap', () => {
        // this.render()
        this.refreshRender();
      });
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
  }

  toggleCollapse(e: PointerEvent) {
    e.stopPropagation();
    const grid = this.shadow.querySelector('.grid') as HTMLDivElement;

    if (this.collapsed) {
      grid.style.setProperty('max-height', `${grid.scrollHeight}px`);
    } else {
      grid.style.setProperty('max-height', '0px');
    }

    this.collapsed = !this.collapsed;
    this.render();
  }
}
