import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import ConfigManager from './configmanager';
import GirafeConfig from './girafeconfig';
import MockHelper from '../tests/mockhelper';
import TestHelper from '../tests/testhelper';

afterAll(() => {
  ConfigManager.getInstance().deleteAllUserPreferences();
});

describe('ConfigManager.loadConfig', () => {
  const manager = ConfigManager.getInstance();
  manager.deleteAllUserPreferences();


  it('should return config if config is already loaded', async () => {
    // @ts-ignore
    manager.config = new GirafeConfig(MockHelper.mockConfig);
    manager.loadConfig().then((config) => {
      // No promise should have been created here, because the config is already given.
      // @ts-ignore
      expect(manager.loadingPromise).toBeNull();
      expect(config).not.toBeNull();
    });
  });

  it('the given configuration entries should be present in the final configuration', async () => {
    // @ts-ignore (use of private member for testing purpose only)
    manager.config = new GirafeConfig(MockHelper.mockConfig);
    manager.loadConfig().then((config) => {
      expect(TestHelper.obj2ContainsObj1PropertiesValues(MockHelper.mockConfig, config)).toBeTruthy();
    });
  });

  it('the default configuration values should be present in the final configuration', async () => {
    // @ts-ignore
    manager.config = new GirafeConfig(MockHelper.mockConfig);
    manager.loadConfig().then((config) => {
      expect(config.themes.imagesUrlPrefix).toEqual('');
      expect(config.general.locale).toEqual(GirafeConfig.DEFAULT_LOCALE);
      expect(config.selection.defaultFocusStrokeColor).toEqual('#ff0000');
      expect(config.drawing.defaultTextSize).toEqual(12);
      expect(config.basemaps.OSM).toEqual(false);
      expect(config.map.showScaleLine).toEqual(true);
    });
  });

  it('the overridden configuration entries should be present in the final configuration', async () => {
    const myConfig = { ...MockHelper.mockConfig };
    myConfig.themes.url = 'https://www.my-custom-themes-url.reg';
    myConfig.map.srid = 'EPSG:2222';
    // @ts-ignore (use of private member for testing purpose only)
    manager.config = new GirafeConfig(myConfig);
    manager.loadConfig().then((config) => {
      expect(TestHelper.obj2ContainsObj1PropertiesValues(myConfig, config)).toBeTruthy();
    });
  });

  it('the new configuration entries should be present in the final configuration', async () => {
    const myConfig = { ...MockHelper.mockConfig };
    // @ts-ignore
    myConfig.languages.translations = { de: 'https://www.my-custom-language-url.reg' };
    // @ts-ignore
    myConfig.drawing = { defaultFillColor: '#333333', defaultFont: 'Verdana' };
    // @ts-ignore
    manager.config = new GirafeConfig(myConfig);
    manager.loadConfig().then((config) => {
      expect(TestHelper.obj2ContainsObj1PropertiesValues(myConfig, config)).toBeTruthy();
    });
  });

  it('should ignore invalid keys in user preferences when loading the config', () => {
    const invalidKey = 'thisIsAnInvalidKey';
    const invalidPath = 'basemaps.' + invalidKey;
    manager.saveUserPreference(invalidPath, 'someValue');
    manager.loadConfig().then((config) => {
      expect(Object.keys(config.basemaps)).not.include(invalidKey);
    });
  });
});

describe('ConfigManager.mergeConfigs', () => {
  const manager = ConfigManager.getInstance();

  it('should merge two empty objects', () => {
    const obj1 = {};
    const obj2 = {};
    // @ts-ignore
    const result = manager.mergeConfigs(obj1, obj2);
    expect(result).toEqual({});
  });

  it('should merge two objects with no common properties', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { c: 3, d: 4 };
    // @ts-ignore
    const result = manager.mergeConfigs(obj1, obj2);
    expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  it('should merge two objects with common properties', () => {
    const obj1 = { a: 1, b: 2, c: { x: 1, y: 2 } };
    const obj2 = { b: 3, c: { y: 4, z: 5 }, d: 4 };
    // @ts-ignore
    const result = manager.mergeConfigs(obj1, obj2);
    expect(result).toEqual({ a: 1, b: 3, c: { x: 1, y: 4, z: 5 }, d: 4 });
  });

  it('should merge two objects with nested common properties', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { d: 2 } } };
    // @ts-ignore
    const result = manager.mergeConfigs(obj1, obj2);
    expect(result).toEqual({ a: { b: { c: 1, d: 2 } } });
  });

  it('should merge two objects with nested non-common properties', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { d: 2 } };
    // @ts-ignore
    const result = manager.mergeConfigs(obj1, obj2);
    expect(result).toEqual({ a: { b: { c: 1 }, d: 2 } });
  });
});

describe('ConfigManager.saveUserPreference', () => {
  const manager = ConfigManager.getInstance();

  beforeEach(() => {
    manager.deleteAllUserPreferences();
  });

  it('should save user preferences in storage by providing a path and simple value', () => {
    const path = 'basemaps.defaultBasemap';
    const newValue = Math.random().toFixed(4).toString();
    manager.saveUserPreference(path, newValue);
    const savedPreferences = manager['loadUserPreferences']();
    expect(savedPreferences).not.toBeNull();
    // @ts-ignore
    expect(savedPreferences.basemaps.defaultBasemap).toBe(newValue);
  });

  it('should overwrite user preferences in storage by providing a path and simple value', () => {
    const path = 'basemaps.defaultBasemap';
    const newValue = 22;
    manager.saveUserPreference(path, newValue);
    const savedPreferences = manager['loadUserPreferences']();
    // @ts-ignore
    expect(savedPreferences.basemaps.defaultBasemap).toBe(newValue);

    const updatedValue = 33;
    manager.saveUserPreference(path, updatedValue);
    const updatedPreferences = manager['loadUserPreferences']();
    // @ts-ignore
    expect(updatedPreferences.basemaps.defaultBasemap).toBe(updatedValue);
  });

  it('should overwrite user preferences in storage by providing a path and object', () => {
    const path = 'customthemes';
    const customThemes = { theme1: [], theme2: [{ c: 1, e: 0, i: 2345, o: 3456 }] };
    manager.saveUserPreference(path, customThemes);

    const savedPreferences = manager['loadUserPreferences']();
    // @ts-ignore
    expect(savedPreferences.customthemes.theme2.length).toEqual(1);

    // Now update the custom themes
    const updatedCustomThemes = { ...customThemes, theme3: [] };
    // @ts-ignore
    delete updatedCustomThemes['theme2'];
    manager.saveUserPreference(path, updatedCustomThemes);

    const updatedPreferences = manager['loadUserPreferences']();
    // @ts-ignore
    expect(updatedPreferences.customthemes.theme3.length).toEqual(0);
    // @ts-ignore
    expect(Object.keys(updatedPreferences.customthemes)).toEqual(['theme1', 'theme3']);
  });
});
