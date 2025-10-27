import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class MenuMobileOfflineButton extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css'];

  icon = 'icons/offline.svg';
  label = 'Offline mode';

  constructor() {
    super('mobile-drawing-button');
  }

  onPointerUp() {
    // If not delaying, the releasing of the click is also fired
    // on the button of the drawing toolbox that's underneath
    // the pointer, resulting in selecting the polygon tool
    setTimeout(() => {
      this.state.interface.drawingPanelVisible = true;
      this.state.interface.swipeupPanelContent = 'offline';
    }, 50);
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
}
