import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class MenuMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', '../../styles/common.mobile.css', './style.css'];

  public constructor() {
    super('menu-mobile');
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.subscribe('interface.swipeupPanelContent', () => {
      this.render();
    });
  }
}
