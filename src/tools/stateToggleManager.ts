import type { Callback } from './state/statemanager';
import State from './state/state';
import StateManager from './state/statemanager';

/**
 * Manages the toggling of state properties based on specified paths.
 * Every paths leading to boolean value will be initially set to false,
 * then activities one will deactivate the others.
 */
export default class StateToggleManager {
  private readonly eventsCallbacks: Callback[] = [];
  private togglePaths: string[];

  constructor(
    togglePaths: string[],
    private stateManager: StateManager
  ) {
    this.togglePaths = StateToggleManager.filterValidTogglePaths(this.stateManager, togglePaths);
    this.initToggle();
    this.watchToggle();
  }

  get state(): State {
    return this.stateManager.state;
  }

  /**
   * To call to destroy properly the component.
   */
  destroy() {
    this.stateManager.unsubscribe(this.eventsCallbacks);
  }

  /**
   * Set to false every state leaded by toggle paths except the specified one.
   * Use the given value on the specified one.
   */
  toggle(setPath: string, newValue: boolean) {
    this.togglePaths
      .filter((path) => path !== setPath)
      .forEach((path) => {
        this.stateManager.setPropertyByPath(this.state, path, false);
      });
    this.stateManager.setPropertyByPath(this.state, setPath, newValue);
  }

  /**
   * Set to false every state leaded by toggle paths.
   */
  deactivateAll() {
    this.toggle(this.togglePaths[0], false);
  }

  /**
   * Initializes the toggle for the given paths.
   * If any of the paths has a truthy value in the state, sets all other paths to false.
   * @private
   */
  private initToggle() {
    let oneActive = false;
    this.togglePaths.forEach((path) => {
      const result = this.stateManager.getPropertyByPath(this.state, path);
      if (oneActive) {
        this.stateManager.setPropertyByPath(this.state, path, false);
      }
      if (result.object === true) {
        oneActive = true;
      }
    });
  }

  /**
   * Watches for changes in togglePaths and invokes the toggle method when a change is detected.
   * @private
   **/
  private watchToggle() {
    this.togglePaths.forEach((path) => {
      this.eventsCallbacks.push(
        this.stateManager.subscribe(path, (oldValue, newValue) => {
          if (oldValue == null) {
            // Don't toggle initial value, needed in tests.
            return;
          }
          if (oldValue !== newValue) {
            this.toggle(path, newValue);
          }
        })
      );
    });
  }

  /**
   * Filters out invalid toggle paths from the given array of paths.
   * Invalid path are path not leading to object in the state, or not leading to boolean value.
   * @static
   */
  static filterValidTogglePaths(stateManager: StateManager, paths: string[]): string[] {
    return paths.filter((path) => {
      const result = stateManager.getPropertyByPath(stateManager.state, path);
      if (result.found && (result.object === true || result.object === false)) {
        return true;
      }
      console.warn(`Configured state toggle path "${path}" doesn't lead to a boolean property. Skip it.`);
      return false;
    });
  }
}
