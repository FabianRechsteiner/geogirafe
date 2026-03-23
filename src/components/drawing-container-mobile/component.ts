// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class DrawingContainerMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', '../../styles/common.mobile.css', './style.css'];

  public constructor() {
    super('drawing-mobile');
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.subscribe('interface.swipeupPanelContent', (_oldContent: string, newContent: string) => {
      // Disable the drawing mode if the swipeup panel were to host anything else than
      // the drawing toolbox
      if (this.state.interface.swipeupPanelContent !== 'drawing' && newContent !== 'drawing') {
        this.state.interface.drawingPanelVisible = false;
      }

      this.render();
    });

    // Disable the drawing mode if the swipeup panel is closed
    this.subscribe('interface.swipeupPanelMode', (_previousState: string, newState: string) => {
      if (newState === 'closed') {
        this.state.interface.drawingPanelVisible = false;
      }
    });
  }
}
