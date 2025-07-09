import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class DisplaySelectorButtonMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css'];

  constructor() {
    super('display-selector-button-mobile');
  }

  connectedCallback() {
    this.subscribe('interface.swipeupPanelContent', () => {
      this.render();
    });
  }

  showSelector() {
    console.log('CLICK');

    this.state.interface.swipeupPanelContent = 'selector';
    this.state.interface.swipeupPanelMode = 'half';
  }
}
