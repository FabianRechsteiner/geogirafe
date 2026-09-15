// SPDX-License-Identifier: Apache-2.0
import type { Callback } from './statemanager';
import State from '../state/state';
import StateManager from '../state/statemanager';
import { setPropertyByPath } from '../utils/pathUtils';
import IGirafePanel from './igirafepanel';

/**
 * Manages the toggling of state properties based on specified paths.
 * Every paths leading to boolean value will be initially set to false,
 * then activities one will deactivate the others.
 */
export default class StateToggleManager {
  private readonly eventsCallbacks: Callback[] = [];
  //private readonly togglePaths: string[];
  private readonly stateManager: StateManager;

  public readonly panels: IGirafePanel[] = [];

  public constructor(elements: IGirafePanel[], stateManager: StateManager) {
    this.panels = elements;
    this.stateManager = stateManager;
    this.watchToggle();
  }

  private get state(): State {
    return this.stateManager.state;
  }

  /**
   * To call to destroy properly the component.
   */
  public destroy() {
    this.stateManager.unsubscribe(this.eventsCallbacks);
  }

  /**
   * Set to false every state leaded by toggle paths except the specified one.
   * Use the given value on the specified one.
   */
  private toggle(panel: IGirafePanel, isVisible: boolean) {
    const panelsToHide = this.panels.filter((p) => p.panelTogglePath !== panel.panelTogglePath);
    for (const panelToHide of panelsToHide) {
      setPropertyByPath(this.state, panelToHide.panelTogglePath, false);
      panelToHide.togglePanel(false);
    }
    setPropertyByPath(this.state, panel.panelTogglePath, isVisible);
    panel.togglePanel(isVisible);
  }

  /**
   * Set to false every state leaded by toggle paths.
   */
  public deactivateAll() {
    for (const panel of this.panels) {
      setPropertyByPath(this.state, panel.panelTogglePath, false);
    }
  }

  /**
   * Watches for changes in togglePaths and invokes the toggle method when a change is detected.
   * @private
   **/
  private watchToggle() {
    for (const panel of this.panels) {
      this.stateManager.subscribe(panel.panelTogglePath, (_, visible) => this.toggle(panel, visible));
    }
  }
}
