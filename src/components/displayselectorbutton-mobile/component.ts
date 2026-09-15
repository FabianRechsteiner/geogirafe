// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class DisplaySelectorButtonMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css'];

  public constructor() {
    super('display-selector-button-mobile');
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.subscribe('interface.swipeupPanelContent', () => {
      this.render();
    });
  }

  showSelector(e: PointerEvent) {
    (e.target as HTMLButtonElement).blur();

    // If the selector is already displayed in a fully or half opened
    // swipeup panel, then it is closed.
    // This is because the button is still visible when the screen is in landscape view
    if (
      this.state.interface.swipeupPanelContent === 'selector' &&
      (this.state.interface.swipeupPanelMode === 'full' ||
        this.state.interface.swipeupPanelMode === 'manual' ||
        this.state.interface.swipeupPanelMode === 'half')
    ) {
      this.state.interface.swipeupPanelMode = 'closed';
      return;
    }

    this.state.interface.swipeupPanelContent = 'selector';
    this.state.interface.swipeupPanelMode = 'half';
  }
}
