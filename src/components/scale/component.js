import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ButtonComponent from '../button/component.js';

class ScaleComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  scaleSpan = null;
  locale = null;
  container = null;
  scales = null;
  
  constructor() {
    super('scale');
  }

  render() {
    super.render();
    this.container = this.shadow.querySelector('#container');
    this.scaleSpan = this.shadow.querySelector('#scale');
    this.locale = this.configManager.Config.general.locale;
    this.scales = this.configManager.Config.map.scales;

    // Add options from themes
    this.scales.forEach(scale => {
      const button = new ButtonComponent();
      button.setAttribute('text', this.formatScale(scale));
      button.setAttribute('size', 'large');
      button.setAttribute('state-action', 'position.scale');
      button.dataset.value = scale;
      this.container.appendChild(button);
    });
  }

  registerEvents() {
    this.stateManager.subscribe('position', (oldPosition, newPosition) => this.onPositionChange(newPosition));
  }

  onPositionChange(position) {
    this.scaleSpan.innerHTML = this.formatScale(position.scale)
  }

  formatScale(scale) {
    return '1:' + Math.floor(scale).toLocaleString(this.locale);
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-scale', ScaleComponent);

export default ScaleComponent;