import { it, expect, describe, beforeAll, afterAll } from 'vitest';
import UserPreferencesComponent from './component';
import MockHelper from '../../tools/tests/mockhelper';
import StateManager from '../../tools/state/statemanager';
import ConfigManager from '../../tools/configuration/configmanager';
import { getPropertyByPath } from '../../tools/utils/pathUtils';

describe('UserPreferencesComponent', () => {
  let stateManager: StateManager;
  let configManager: ConfigManager;
  let component: UserPreferencesComponent;

  beforeAll(() => {
    MockHelper.startMocking();
    stateManager = StateManager.getInstance();
    configManager = ConfigManager.getInstance();
    if (!customElements.get('girafe-user-preferences')) {
      customElements.define('girafe-user-preferences', UserPreferencesComponent);
    }
    component = new UserPreferencesComponent();
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  it('has a preference object with valid state paths', () => {
    const resultArray = [];

    for (const key in component.preferences) {
      const result = getPropertyByPath(stateManager.state, component.preferences[key].statePath);
      resultArray.push(result.found);
    }
    expect(resultArray.every((r) => r)).toBe(true);
  });

  it('has a preference object with valid config paths', () => {
    const resultArray = [];

    for (const key in component.preferences) {
      const result = getPropertyByPath(configManager.Config, component.preferences[key].configPath);
      resultArray.push(result.found);
    }
    expect(resultArray.every((r) => r)).toBe(true);
  });
});
