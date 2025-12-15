import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class PrototypeBannerComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  public constructor() {
    super('prototype');
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
  }
}

export default PrototypeBannerComponent;
