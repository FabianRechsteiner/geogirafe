import type { Callback } from './statemanager';
import State from '../state/state';
import StateManager from '../state/statemanager';
import { getPropertyByPath, setPropertyByPath } from '../utils/pathUtils';

/**
 * Manages the toggling of state properties based on specified paths.
 * Every paths leading to boolean value will be initially set to false,
 * then activities one will deactivate the others.
 */
export default class StateToggleManager {
  private readonly eventsCallbacks: Callback[] = [];
  private togglePaths: string[];
  private readonly stateManager: StateManager;

  constructor(togglePaths: string[], stateManager: StateManager) {
    this.togglePaths = togglePaths;
    this.stateManager = stateManager;
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
        setPropertyByPath(this.state, path, false);
      });
    setPropertyByPath(this.state, setPath, newValue);
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
      const result = getPropertyByPath(this.state, path);
      if (oneActive) {
        setPropertyByPath(this.state, path, false);
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
}
