import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import type Basemap from '../../../models/basemaps/basemap';

export default class BasemapListItemMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];
  public basemap!: Basemap;
  public isActive = false;

  constructor() {
    super('basemap-list-element-mobile');
  }

  activate() {
    this.state.activeBasemap = this.basemap;
  }

  connectedCallback() {
    // The component needs to wait for the list of layers to be available
    this.subscribe('basemaps', (_oldValue: Record<number, Basemap>, newValue: Record<number, Basemap>) => {
      const basemapId = this.getAttribute('basemapid');
      if (!basemapId) {
        return;
      }

      this.basemap = newValue[Number.parseInt(basemapId)];

      if (!this.basemap) {
        return;
      }

      this.isActive = this.state.activeBasemap === this.basemap;
      this.render();

      const container = this.shadow.getElementById('basemap-container') as HTMLDivElement;
      container.style.setProperty('background-image', `url(${this.basemap.thumbnail})`);
    });

    this.subscribe('activeBasemap', (_oldValue: Basemap, newValue: Basemap) => {
      this.isActive = newValue === this.basemap && newValue !== null;
      this.render();
    });
  }
}
