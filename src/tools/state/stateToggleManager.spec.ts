import { it, describe, expect, beforeAll, afterAll } from 'vitest';
import StateToggleManager from './stateToggleManager';
import MockHelper from '../tests/mockhelper';
import StateManager from '../state/statemanager';
import State from '../state/state';
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
    'interface.drawingPanelVisible',
    'interface.printPanelVisible',
    'state.language',
    'interface.userPreferencesPanelVisible'
  ];

  beforeAll(() => {
    state = stateManager.state;
    state.interface.helpVisible = true;
    state.interface.drawingPanelVisible = false;
    state.interface.printPanelVisible = true;
    state.interface.userPreferencesPanelVisible = false;
    state.language = 'fr';
    stateToggleManager = new StateToggleManager(paths, stateManager);
  });

  it('initToggle', () => {
    expect(state.interface.helpVisible).toBeTruthy();
    expect(state.interface.drawingPanelVisible).toBeFalsy();
    expect(state.interface.printPanelVisible).toBeFalsy();
    expect(state.interface.userPreferencesPanelVisible).toBeFalsy();
    expect(state.language).toEqual('fr');
  });

  it('toggles by watching', () => {
    state.interface.drawingPanelVisible = true;
    expect(state.interface.helpVisible).toBeFalsy();
    expect(state.interface.drawingPanelVisible).toBeTruthy();
    expect(state.interface.printPanelVisible).toBeFalsy();
    expect(state.interface.userPreferencesPanelVisible).toBeFalsy();
  });

  it('deactivateAll', () => {
    stateToggleManager.deactivateAll();
    expect(state.interface.helpVisible).toBeFalsy();
    expect(state.interface.drawingPanelVisible).toBeFalsy();
    expect(state.interface.printPanelVisible).toBeFalsy();
    expect(state.interface.userPreferencesPanelVisible).toBeFalsy();
  });

  it('filterValidTogglePaths', () => {
    const filteredPaths = StateToggleManager.filterValidTogglePaths(stateManager, paths);
    expect(filteredPaths).not.toContain(paths[3]);
    expect(filteredPaths.length).toEqual(4);
  });
});
