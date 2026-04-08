// SPDX-License-Identifier: Apache-2.0
import GirafeResizableElement from '../../base/GirafeResizableElement';
import IGirafePanel, { isGirafePanel } from '../../tools/state/igirafepanel';
import StateToggleManager from '../../tools/state/stateToggleManager';

/**
 * A panel component that extends GirafeResizableElement.
 * Used as main Left and Right panels on the app.
 * It has a state toggle manager that can activate or deactivate
 * toggle paths based on changes in its state.
 * It also has methods to shows/hide itself based on the state toggle paths and state.
 *
 * To have the toggle on the state working, the component must implement the IGirafePanel interface
 * and be added to the lr-panel:
 * <girafe-lr-panel>
 *   <any slot="main"></any>
 *   <any slot="main"></any>
 * </girafe-lr-panel>
 */
class LRPanelComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  private stateToggleManager?: StateToggleManager;
  public panelTitle: string = 'Unknown panel';

  public get hasMultipleChilds() {
    if (this.stateToggleManager) {
      return this.stateToggleManager.panels.length > 1;
    }
    return false;
  }

  public constructor() {
    super('lr-panel');
  }

  protected override connectedCallback(): void {
    super.connectedCallback();
    this.render();

    // Add the dock mode as class on the panel to allow setting differents styles
    // depending on the docking position
    const panel = this.shadow.getElementById('panel');
    panel?.classList.add(this.dock);

    const elements = this.shadow.querySelectorAll('slot')[0].assignedElements();
    if (elements.length > 1) {
      // We only want to manage toggle is more than 1 panel exists
      this.retrieveTogglePanels(elements).then((panels) => {
        this.stateToggleManager = new StateToggleManager(panels, this.context.stateManager);
        this.registerOnChildChange(panels);
      });
    }
  }

  /**
   * Closes the panel by deactivating all state toggles and hiding itself.
   */
  closePanel() {
    this.stateToggleManager!.deactivateAll();
    this.hide();
  }

  /**
   * Retrieve the (valid boolean) toggle paths from child elements of the main slot.
   */
  private async retrieveTogglePanels(elements: Element[]): Promise<IGirafePanel[]> {
    const panels: IGirafePanel[] = [];
    for (const element of elements) {
      await customElements.whenDefined(element.tagName.toLowerCase());
      if (isGirafePanel(element)) {
        panels.push(element);
      } else {
        throw new Error('To be able to be used as a panel, the Component should implement the interface IGirafePanel.');
      }
    }
    return panels;
  }

  /**
   * Subscribes to changes in togglePaths and shows or hides the component based on the changes.
   */
  private registerOnChildChange(panels: IGirafePanel[]) {
    for (const panel of panels) {
      this.subscribe(panel.panelTogglePath, () => this.renderPanel(panel));
    }
  }

  public renderPanel(panel: IGirafePanel) {
    if (panel.isPanelVisible) {
      this.panelTitle = panel.panelTitle;
      this.show();
      this.refreshRender();
    } else {
      this.hide();
    }
  }
}

export default LRPanelComponent;
