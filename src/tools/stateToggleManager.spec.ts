import { it, describe, expect, beforeAll, afterAll } from 'vitest';
import StateToggleManager from './stateToggleManager';
import MockHelper from './tests/mockhelper';
import StateManager from './state/statemanager';
import State from './state/state';
let stateManager: StateManager;

beforeAll(() => {
  MockHelper.startMocking();
  stateManager = StateManager.getInstance();
});

afterAll(() => {
  MockHelper.stopMocking();
});

describe('StateToggleManager class', () => {
  let state: State;
  let stateToggleManager: StateToggleManager;
  const paths = [
    'interface.helpVisible',
    'interface.redliningPanelVisible',
    'interface.printPanelVisible',
    'state.language'
  ];

  beforeAll(() => {
    state = stateManager.state;
    state.interface.helpVisible = true;
    state.interface.redliningPanelVisible = false;
    state.interface.printPanelVisible = true;
    state.language = 'fr';
    stateToggleManager = new StateToggleManager(paths, stateManager);
  });

  it('initToggle', () => {
    expect(state.interface.helpVisible).toBeTruthy();
    expect(state.interface.redliningPanelVisible).toBeFalsy();
    expect(state.interface.printPanelVisible).toBeFalsy();
    expect(state.language).toEqual('fr');
  });

  it('toggles by watching', () => {
    state.interface.redliningPanelVisible = true;
    expect(state.interface.helpVisible).toBeFalsy();
    expect(state.interface.redliningPanelVisible).toBeTruthy();
    expect(state.interface.printPanelVisible).toBeFalsy();
  });

  it('deactivateAll', () => {
    stateToggleManager.deactivateAll();
    expect(state.interface.helpVisible).toBeFalsy();
    expect(state.interface.redliningPanelVisible).toBeFalsy();
    expect(state.interface.printPanelVisible).toBeFalsy();
  });

  it('filterValidTogglePaths', () => {
    const filteredPaths = StateToggleManager.filterValidTogglePaths(stateManager, paths);
    expect(filteredPaths).not.toContain(paths[3]);
    expect(filteredPaths.length).toEqual(3);
  });
});
