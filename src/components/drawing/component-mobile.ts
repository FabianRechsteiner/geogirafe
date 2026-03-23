// SPDX-License-Identifier: Apache-2.0
import DrawingComponent from './component';

export default class DrawingComponentMobile extends DrawingComponent {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css', './style-mobile-delta.css'];

  public constructor() {
    super('drawing-mobile');
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.subscribe('interface.swipeupPanelContent', (_oldContent: string, newContent: string) => {
      if (this.state.interface.swipeupPanelContent === 'drawing' || newContent === 'drawing') {
        this.togglePanel(true);
      }
    });
  }
}
