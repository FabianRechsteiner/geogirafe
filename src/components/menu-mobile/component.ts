import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class MenuMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', '../../styles/common.mobile.css', './style.css'];

  constructor() {
    super('menu-mobile');
  }

  connectedCallback() {
    this.subscribe('interface.swipeupPanelContent', () => {
      this.render();
    });
  }
}
