import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class BasemapThemeLayerSelectorMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css'];

  constructor() {
    super('basemap-theme-layer-selector-mobile');
  }

  connectedCallback() {
    this.subscribe('interface.swipeupPanelContent', () => {
      this.render();
    });
  }
}
