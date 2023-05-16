import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class GlobeComponent extends GirafeHTMLElement {

  menuButton = null;
  
  constructor() {
    super('globe');
  }

  render() {
    super.render();
    this.menuButton = this.shadow.querySelector('#menu-button');
  }

  registerEvents() {
    //this.stateManager.subscribe('globe.display', () => this.onGlobeChanged());
  }

  onGlobeChanged() {
    // TODO REG : Do we want to do this?
    /*if (this.state.globe.display === 'full') {
      // Full screen globe has been enabled
      this.menuButton.setText('3D');
    }
    else if (this.state.globe.display === 'side') {
      // Side by side has been enabled
      this.menuButton.setText('Both');
    }
    else {
      // 3d map is not visible
      this.menuButton.setText('2D');
    }*/
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      super.translate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-globe-select', GlobeComponent);

export default GlobeComponent;