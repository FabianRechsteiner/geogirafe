import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class ScaleComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = '../../styles/common.css';

  constructor() {
    super('scale');
  }

  render() {
    this.configManager.loadConfig().then(() => {
      super.render();
    });
  }

  registerEvents() {
    this.subscribe('position', () => this.onScaleChanged());
  }

  onScaleChanged() {
    super.render();
  }

  getFormatedScale(scale?: number) {
    const scaleToFormat = scale ?? this.state.position.scale;
    if (scaleToFormat) {
      return '1:' + Math.floor(scaleToFormat).toLocaleString(this.configManager.Config.general.locale);
    }

    return 'No scale';
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

export default ScaleComponent;
