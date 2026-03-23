// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class ScaleComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = '../../styles/common.css';

  public constructor() {
    super('scale');
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
      return '1:' + Math.floor(scaleToFormat).toLocaleString(this.context.configManager.Config.general.locale);
    }

    return 'No scale';
  }

  protected override connectedCallback() {
    super.connectedCallback();
    super.render();
    super.girafeTranslate();
    this.registerEvents();
  }
}

export default ScaleComponent;
