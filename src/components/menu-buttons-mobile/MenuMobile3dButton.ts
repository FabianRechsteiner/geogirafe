import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class MenuMobile3dButton extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css'];

  icon = 'icons/globe.svg';
  label = '2D / 3D';

  constructor() {
    super('mobile-3d-button');
  }

  onPointerUp() {
    this.state.globe.display = this.state.globe.display === '3D' ? '2D' : '3D';
  }

  connectedCallback() {
    this.render();
  }
}
