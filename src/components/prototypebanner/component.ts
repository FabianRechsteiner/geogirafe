import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class PrototypeBannerComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  constructor() {
    super('prototype');
  }

  connectedCallback() {
    this.render();
  }
}

export default PrototypeBannerComponent;
