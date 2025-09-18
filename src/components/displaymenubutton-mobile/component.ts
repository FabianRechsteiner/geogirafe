import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class DisplayMenuButtonMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css'];

  constructor() {
    super('display-menu-button-mobile');
  }

  connectedCallback() {
    this.subscribe('interface.swipeupPanelContent', () => {
      this.render();
    });
  }

  showMenu(e: PointerEvent) {
    (e.target as HTMLButtonElement).blur();

    // If the menu is already displayed in a fully or half opened
    // swipeup panel, then it is closed.
    // This is because the button is still visible when the screen is in landscape view
    if (
      this.state.interface.swipeupPanelContent === 'menu' &&
      (this.state.interface.swipeupPanelMode === 'full' ||
        this.state.interface.swipeupPanelMode === 'manual' ||
        this.state.interface.swipeupPanelMode === 'half')
    ) {
      this.state.interface.swipeupPanelMode = 'closed';
      return;
    }

    this.state.interface.swipeupPanelContent = 'menu';
    this.state.interface.swipeupPanelMode = 'half';
  }
}
