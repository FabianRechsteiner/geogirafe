import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class PrototypeBannerComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  constructor() {
    super('prototype');
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
}

export default PrototypeBannerComponent;
