import { describe, it, expect } from 'vitest';
import GirafeConfig from './girafeconfig';
import MockHelper from '../tests/mockhelper';
import TestHelper from '../tests/testhelper';
import { MockConfig } from '../tests/mockconfig';

describe('ConfigManager.loadConfig', () => {
  const context = MockHelper.startMocking();
  const manager = context.configManager;

  it('should return config if config is already loaded', async () => {
    // @ts-ignore
    manager.config = new GirafeConfig(MockConfig);
    manager.loadConfig().then((config) => {
      // No promise should have been created here, because the config is already given.
      // @ts-ignore
      expect(manager.loadingPromise).toBeNull();
      expect(config).not.toBeNull();
    });
  });

  it('the given configuration entries should be present in the final configuration', async () => {
    // @ts-ignore (use of private member for testing purpose only)
    manager.config = new GirafeConfig(MockConfig);
    manager.loadConfig().then((config) => {
      expect(TestHelper.obj2ContainsObj1PropertiesValues(MockConfig, config)).toBeTruthy();
    });
  });

  it('the default configuration values should be present in the final configuration', async () => {
    // @ts-ignore
    manager.config = new GirafeConfig(MockConfig);
    manager.loadConfig().then((config) => {
      expect(config.themes.imagesUrlPrefix).toEqual('');
      expect(config.general.locale).toEqual(GirafeConfig.DEFAULT_LOCALE);
      expect(config.selection.highlightStrokeColor).toEqual('#00ff22');
      expect(config.drawing.defaultTextSize).toEqual(12);
      expect(config.basemaps.OSM).toEqual(false);
      expect(config.map.showScaleLine).toEqual(true);
    });
  });

  it('the overridden configuration entries should be present in the final configuration', async () => {
    const myConfig = { ...MockConfig };
    myConfig.themes.url = 'https://www.my-custom-themes-url.reg';
    myConfig.map.srid = 'EPSG:2222';
    // @ts-ignore (use of private member for testing purpose only)
    manager.config = new GirafeConfig(myConfig);
    manager.loadConfig().then((config) => {
      expect(TestHelper.obj2ContainsObj1PropertiesValues(myConfig, config)).toBeTruthy();
    });
  });

  it('the new configuration entries should be present in the final configuration', async () => {
    const myConfig = { ...MockConfig };
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
    const myConfig = { ...MockConfig };
    // @ts-ignore
    myConfig.basemaps[invalidKey] = 'someValue';
    // @ts-ignore
    manager.config = new GirafeConfig(myConfig);
    manager.loadConfig().then((config) => {
      expect(Object.keys(config.basemaps)).not.include(invalidKey);
    });
  });

  it('should manage if there is no third-party config in the extended configuration', () => {
    // @ts-ignore
    manager.config = new GirafeConfig(MockConfig);
    manager.loadConfig().then((config) => {
      expect(Object.keys(config)).toContain('extendedConfig');
      expect(config.extendedConfig).toBeUndefined();
    });
  });

  it('should contain third-party config in the extended configuration', () => {
    const thirdPartyConfig = {
      fancyExtension: {
        someConfig: 'someValue',
        someOtherConfig: 42,
        someThirdConfig: ['someThirdValue']
      }
    };
    const myConfig = { ...MockConfig };
    // @ts-ignore
    myConfig.extendedConfig = thirdPartyConfig;
    // @ts-ignore
    manager.config = new GirafeConfig(myConfig);
    manager.loadConfig().then((config) => {
      expect(config.extendedConfig).toBeDefined();
      // @ts-ignore
      expect(TestHelper.obj2ContainsObj1PropertiesValues(myConfig.extendedConfig, config.extendedConfig)).toBeTruthy();
    });
  });
});
