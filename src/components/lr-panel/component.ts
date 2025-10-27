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
 *   <any slot="main" data-toggle-path="my.state.path1.to.boolean"></any>
 *   <any slot="main" data-toggle-path="my.state.path2.to.boolean"></any>
 * </girafe-lr-panel>
 */
class LRPanelComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  private stateToggleManager!: StateToggleManager;
  public title: string = 'Unknown panel';
  private panelTitles: Record<string, string> = {};
  public get hasMultipleChilds() {
    return Object.keys(this.panelTitles).length > 1;
  }

  constructor() {
    super('lr-panel');
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.render();

    // Add the dock mode as class on the panel to allow setting differents styles
    // depending on the docking position
    const panel = this.shadow.getElementById('panel');
    panel?.classList.add(this.dock);

    const togglePaths = this.retrieveTogglePaths();
    this.stateToggleManager = new StateToggleManager(togglePaths, this.context.stateManager);
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
    const elements = this.shadow.querySelectorAll('slot')[0].assignedNodes();
    const togglePaths: string[] = [];
    for (const element of elements) {
      const togglePath = (element as HTMLElement).dataset['togglePath'];
      const panelTitle = (element as HTMLElement).dataset['title'] ?? 'Unknown panel';
      if (togglePath) {
        this.panelTitles[togglePath] = panelTitle;
        togglePaths.push(togglePath);
      }
    }

    return StateToggleManager.filterValidTogglePaths(this.context.stateManager, togglePaths);
  }

  /**
   * Subscribes to changes in togglePaths and shows or hides the component based on the changes.
   */
  private showOnChildChange(togglePaths: string[]) {
    togglePaths.forEach((path) => {
      this.subscribe(path, (oldValue, newValue) => {
        if (oldValue !== newValue) {
          if (newValue) {
            this.title = this.panelTitles[path];
            this.show();
            this.refreshRender();
          } else {
            this.hide();
          }
        }
      });
    });
  }
}

export default LRPanelComponent;
