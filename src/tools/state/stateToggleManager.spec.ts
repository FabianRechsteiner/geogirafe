import { it, describe, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import StateToggleManager from './stateToggleManager';
import MockHelper from '../tests/mockhelper';
import StateManager from '../state/statemanager';
import IGirafeContext from '../context/icontext';
import IGirafePanel from './igirafepanel';

let stateManager: StateManager;
let context: IGirafeContext;

beforeAll(() => {
  context = MockHelper.startMocking();
  stateManager = context.stateManager;
});

afterAll(() => {
  MockHelper.stopMocking(context);
});

class TestPanel implements IGirafePanel {
  isPanelVisible = false;
  panelTitle = 'test';
  panelTogglePath: string;

  constructor(title: string, path: string) {
    this.panelTitle = title;
    this.panelTogglePath = path;
  }

  togglePanel(isVisible: boolean): void {
    this.isPanelVisible = isVisible;
  }
}

describe('StateToggleManager class', () => {
  let stateToggleManager: StateToggleManager;
  const panels = [
    new TestPanel('help', 'interface.helpVisible'),
    new TestPanel('drawing', 'interface.drawingPanelVisible'),
    new TestPanel('print', 'interface.printPanelVisible'),
    new TestPanel('userprefs', 'interface.userPreferencesPanelVisible'),
    new TestPanel('share', 'interface.sharePanelVisible')
  ];

  beforeEach(() => {
    stateToggleManager = new StateToggleManager(panels, stateManager);
  });

  it('toggles by watching', () => {
    const state = stateManager.state;
    state.interface.drawingPanelVisible = true;
    expect(state.interface.helpVisible).toBeFalsy();
    expect(state.interface.drawingPanelVisible).toBeTruthy();
    expect(state.interface.printPanelVisible).toBeFalsy();
    expect(state.interface.userPreferencesPanelVisible).toBeFalsy();
    expect(state.interface.sharePanelVisible).toBeFalsy();

    state.interface.userPreferencesPanelVisible = true;
    expect(state.interface.helpVisible).toBeFalsy();
    expect(state.interface.drawingPanelVisible).toBeFalsy();
    expect(state.interface.printPanelVisible).toBeFalsy();
    expect(state.interface.userPreferencesPanelVisible).toBeTruthy();
    expect(state.interface.sharePanelVisible).toBeFalsy();
  });

  it('deactivateAll', () => {
    const state = stateManager.state;
    stateToggleManager.deactivateAll();
    expect(state.interface.helpVisible).toBeFalsy();
    expect(state.interface.drawingPanelVisible).toBeFalsy();
    expect(state.interface.printPanelVisible).toBeFalsy();
    expect(state.interface.userPreferencesPanelVisible).toBeFalsy();
    expect(state.interface.sharePanelVisible).toBeFalsy();
  });
});
