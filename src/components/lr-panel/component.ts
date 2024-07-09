import GirafeResizableElement from '../../base/GirafeResizableElement';
import StateToggleManager from '../../tools/state/stateToggleManager';

/**
 * A panel component that extends GirafeResizableElement.
 * Used as main Left and Right panels on the app.
 * It has a state toggle manager that can activate or deactivate
 * toggle paths based on changes in its state.
 * It also has methods to shows/hide itself based on the state toggle paths and state.
 *
 * To have the toggle on the state working, the component must have this structure, with
 * a slot="main" and children with the data-toggle-path set:
 * <girafe-lr-panel>
 *   <div slot="main">
 *     <any data-toggle-path="my.state.path1.to.boolean"></any>
 *     <any data-toggle-path="my.state.path2.to.boolean"></any>
 *   </div>
 * </girafe-lr-panel>
 */
class LRPanelComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';
  private stateToggleManager: StateToggleManager;

  constructor() {
    super('lr-panel');
    this.render();
    this.panel?.classList.add(this.dock);
    const togglePaths = this.retrieveTogglePaths();
    this.stateToggleManager = new StateToggleManager(togglePaths, this.stateManager);
    this.showOnChildChange(togglePaths);
  }

  /**
   * Closes the panel by deactivating all state toggles and hiding itself.
   */
  closePanel() {
    this.stateToggleManager.deactivateAll();
    this.hide();
  }

  /**
   * Retrieve the (valid boolean) toggle paths from child elements of the main slot.
   */
  private retrieveTogglePaths(): string[] {
    const slots = [...(this.panel?.querySelectorAll('slot') || [])];
    const mainSlot = slots.filter((node) => node.name === 'main')[0];
    const slotContent = mainSlot.assignedNodes()[0] as HTMLElement;
    const elements = [...slotContent.children] as HTMLElement[];
    const togglePaths: string[] = [];
    [...elements].forEach((element) => {
      const togglePath = element.dataset['togglePath'];
      if (togglePath) {
        togglePaths.push(togglePath);
      }
    });
    return StateToggleManager.filterValidTogglePaths(this.stateManager, togglePaths);
  }

  /**
   * Subscribes to changes in togglePaths and shows or hides the component based on the changes.
   */
  private showOnChildChange(togglePaths: string[]) {
    togglePaths.forEach((path) => {
      this.stateManager.subscribe(path, (oldValue, newValue) => {
        if (oldValue !== newValue) {
          if (newValue) {
            this.show();
          } else {
            this.hide();
          }
        }
      });
    });
  }
}

export default LRPanelComponent;
