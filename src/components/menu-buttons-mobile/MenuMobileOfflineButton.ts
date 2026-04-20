// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class MenuMobileOfflineButton extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css'];

  icon = 'icons/offline.svg';
  label = 'Offline mode';

  public constructor() {
    super('mobile-offline-button');
  }

  onPointerUp() {
    // If not delaying, the releasing of the click is also fired
    // on the offline panel shown
    setTimeout(() => {
      this.state.interface.offlinePanelVisible = true;
      this.state.interface.swipeupPanelContent = 'offline';
    }, 50);
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
  }
}
