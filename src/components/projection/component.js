import GirafeHTMLElement from '../../base/GirafeHTMLElement.js';

class ProjectionComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  menuButton = null;
  // TODO REG : manage in config.json
  valueToText = {
    "EPSG:3857": "W-M",
    "EPSG:4326": "WGS84",
    "EPSG:2056": "LV95"
  }
  
  constructor() {
    super('projection');
  }

  render() {
    super.render();
    this.menuButton = this.shadow.querySelector('#menu-button');

    // Get all combinaison text/value from girafe-button objects
    const allButtons = this.shadow.querySelectorAll('girafe-button');
    for (let i=0; i<allButtons.length; ++i) {
      const b = allButtons[i];
      b.setText(this.valueToText[b.dataset.value]);
    }
  }

  registerEvents() {
    this.stateManager.subscribe('projection', (oldProjection, newProjection) => this.onChangeProjection(newProjection));
  }

  onChangeProjection(projection) {
    console.log('projection changed');
    const text = this.valueToText[projection];
    this.menuButton.setText(text);
    this.menuButton.closeMenu();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-proj-select', ProjectionComponent);

export default ProjectionComponent;