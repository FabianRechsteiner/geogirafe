import { it, expect, describe, beforeAll, afterAll } from 'vitest';
import UserPreferencesComponent from './component';
import MockHelper from '../../tools/tests/mockhelper';
import StateManager from '../../tools/state/statemanager';
import ConfigManager from '../../tools/configuration/configmanager';
import { getPropertyByPath } from '../../tools/utils/pathUtils';
import CustomThemesManager from '../../tools/themes/customthemesmanager';

describe('UserPreferencesComponent', () => {
  let stateManager: StateManager;
  let configManager: ConfigManager;
  let customThemesManager: CustomThemesManager;
  let component: UserPreferencesComponent;

  beforeAll(() => {
    MockHelper.startMocking();
    stateManager = StateManager.getInstance();
    configManager = ConfigManager.getInstance();
    customThemesManager = CustomThemesManager.getInstance();
    if (!customElements.get('girafe-user-preferences')) {
      customElements.define('girafe-user-preferences', UserPreferencesComponent);
    }
    component = new UserPreferencesComponent();
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  const setRandomPreferenceValues = () => {
    for (const key in component.preferences) {
      const preference = component.preferences[key];
      let newRandomValue: unknown;
      if (preference.uiElement === 'select') {
        if (preference.options.length === 0) {
          continue;
        }
        const randomOption = Math.round(Math.random() * preference.options.length);
        newRandomValue = preference.options[Math.max(randomOption - 1, 0)].value;
      } else if (preference.uiElement === 'checkbox') {
        newRandomValue = !preference.currentValue;
      } else if (preference.uiElement === 'color') {
        newRandomValue = '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0');
      } else {
        throw Error(`${key} can't be tested, no random value defined.`);
      }
      component.preferences[key].currentValue = newRandomValue;
    }
  };

  it('has preference objects with a valid state path', () => {
    for (const key in component.preferences) {
      if (component.preferences[key].statePath !== null) {
        const result = getPropertyByPath(stateManager.state, component.preferences[key].statePath);
        expect(result.found, `path ${component.preferences[key].statePath} not found in state`).toBe(true);
      }
    }
  });

  it('has preference objects with a valid config path', () => {
    for (const key in component.preferences) {
      const result = getPropertyByPath(configManager.Config, component.preferences[key].configPath);
      expect(result.found, `path ${component.preferences[key].configPath} not found in config`).toBe(true);
    }
  });

  it('correctly updates the config after changing the preference value', () => {
    component['initPreferenceOptions']();
    component['initCurrentPreferenceValues']();
    setRandomPreferenceValues();

    for (const key in component.preferences) {
      const preference = component.preferences[key];
      component['updatePreferenceInConfig'](key);
      const result = getPropertyByPath(configManager.Config, preference.configPath);
      expect(
        preference.currentValue,
        `${key} isn't correctly updated in config, path: ${preference.configPath}`
      ).toEqual(result.parentObject[result.lastKey!]);
    }
  });

  it('deletes all user preferences in the local storage when resetting the preferences', () => {
    component['initPreferenceOptions']();
    component['initCurrentPreferenceValues']();
    setRandomPreferenceValues();

    for (const key in component.preferences) {
      component['updatePreferenceInStorage'](key);
    }
    // @ts-ignore
    component.resetAll();

    const localStorage = configManager['loadUserPreferences']();
    const allUserPreferencesKeys = Object.keys(component.preferences);
    expect(Object.keys(localStorage)).not.toContain(allUserPreferencesKeys);
  });

  it('does not delete any additional properties in the local storage when resetting the preferences', () => {
    component['initPreferenceOptions']();
    component['initCurrentPreferenceValues']();
    setRandomPreferenceValues();

    for (const key in component.preferences) {
      component['updatePreferenceInStorage'](key);
    }
    configManager.saveUserPreference(customThemesManager['storagePath'], { thisIsACustomTheme: [] });

    // Now reset user preferences
    // @ts-ignore
    component.resetAll();

    const localStorage = configManager['loadUserPreferences']();
    const allUserPreferencesKeys = Object.keys(component.preferences);
    expect(Object.keys(localStorage)).not.toContain(allUserPreferencesKeys);
    expect(Object.keys(localStorage)).toContain(customThemesManager['storagePath']);
  });
});
