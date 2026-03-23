// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import I18nManager, { TranslationsDict } from './i18nmanager';
import MockHelper from '../tests/mockhelper';
import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import IGirafeContext from '../context/icontext';

describe('I18nManager.loadTranslations', () => {
  let i18nManager: I18nManager;
  let configManager: ConfigManager;
  const fetchMock = vi.fn();
  let context: IGirafeContext;

  beforeEach(() => {
    context = MockHelper.startMocking();
    // @ts-expect-error: private property
    context.i18nManager.translations = {};
    i18nManager = context.i18nManager;
    // @ts-expect-error: private property
    i18nManager.loadingLanguagePromise = null;
    configManager = context.configManager;
    configManager.Config.languages.translations = {};
    globalThis.fetch = fetchMock;
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should return cached translations if already loaded', async () => {
    // @ts-expect-error: private property
    i18nManager.translations['fr'] = { layer: 'couche' };
    // @ts-ignore
    const translations = await i18nManager.loadTranslations('fr');
    expect(translations).toEqual({ layer: 'couche' });
  });

  it('should return loadingLanguagePromise if translations are being loaded', async () => {
    const promise = new Promise<TranslationsDict>((resolve) => {
      setTimeout(() => resolve({ layer: 'couche' }), 100);
    });
    // @ts-expect-error: private property
    i18nManager.loadingLanguagePromise = promise;
    // @ts-ignore
    const translations = await i18nManager.loadTranslations('fr');
    expect(translations).toEqual({ layer: 'couche' });
  });

  it('should load and merge translations from provided URLs', async () => {
    // Simulate 2 translation files
    configManager.Config.languages.translations['fr'] = ['file1.json', 'file2.json'];
    const response1 = { fr: { layer: 'couche' } };
    const response2 = { fr: { map: 'carte' } };
    fetchMock
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(response1) })
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(response2) });

    // @ts-ignore
    const translations = await i18nManager.loadTranslations('fr');

    expect(translations).toEqual({ layer: 'couche', map: 'carte' });
    // @ts-expect-error: private property
    expect(i18nManager.translations['fr']).toEqual({ layer: 'couche', map: 'carte' });
    // @ts-expect-error: private property
    expect(i18nManager.loadingLanguagePromise).toBeNull();
  });

  it('should load and merge/overwrite translations from provided URLs', async () => {
    // Simulate 2 translation files
    configManager.Config.languages.translations['fr'] = ['file1.json', 'file2.json'];
    const response1 = { fr: { layer: 'couche' } };
    const response2 = { fr: { layer: 'reg', map: 'carte' } };
    fetchMock
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(response1) })
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(response2) });

    // @ts-ignore
    const translations = await i18nManager.loadTranslations('fr');

    expect(translations).toEqual({ layer: 'reg', map: 'carte' });
    // @ts-expect-error: private property
    expect(i18nManager.translations['fr']).toEqual({ layer: 'reg', map: 'carte' });
    // @ts-expect-error: private property
    expect(i18nManager.loadingLanguagePromise).toBeNull();
  });

  it('should load and merge/overwrite translations from provided URLs (2)', async () => {
    // Simulate 2 translation files
    configManager.Config.languages.translations['fr'] = ['file1.json', 'file2.json'];
    const response1 = { fr: { layer: 'reg', map: 'carte' } };
    const response2 = { fr: { layer: 'couche' } };
    fetchMock
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(response1) })
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(response2) });

    // @ts-ignore
    const translations = await i18nManager.loadTranslations('fr');

    expect(translations).toEqual({ layer: 'couche', map: 'carte' });
    // @ts-expect-error: private property
    expect(i18nManager.translations['fr']).toEqual({ layer: 'couche', map: 'carte' });
    // @ts-expect-error: private property
    expect(i18nManager.loadingLanguagePromise).toBeNull();
  });

  it('should throw an error if no languages are found in config', async () => {
    configManager.Config.languages.translations = {};
    // @ts-ignore
    await expect(i18nManager.loadTranslations('fr')).rejects.toThrow('No languages found in config.json');
  });
});

describe('I18nManager.getTranslation', () => {
  let i18nManager: I18nManager;
  let stateManager: StateManager;
  let context: IGirafeContext;

  beforeEach(() => {
    context = MockHelper.startMocking();
    // @ts-expect-error: private property
    context.i18nManager.translations = {
      fr: { layer: 'couche', map: 'carte' },
      en: { layer: 'layer', map: 'map' }
    };
    i18nManager = context.i18nManager;
    stateManager = context.stateManager;
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should return translation for existing key in current language', () => {
    // Set current language to French
    stateManager.state.language = 'fr';

    const translation = i18nManager.getTranslation('layer');
    expect(translation).toBe('couche');
  });

  it('should return key if translation does not exist in current language', () => {
    // Set current language to French
    stateManager.state.language = 'fr';

    const translation = i18nManager.getTranslation('unknownKey');
    expect(translation).toBe('unknownKey');
  });

  it('should return key if translation does not exist in default language', () => {
    // Set current language to French (where 'unknownKey' does not exist)
    stateManager.state.language = 'fr';

    const translation = i18nManager.getTranslation('unknownKey');
    expect(translation).toBe('unknownKey');
  });

  it('should return key if translation does not exist in any language', () => {
    // Unset translations
    // @ts-expect-error: private property
    i18nManager.translations = {};

    // Set current language to English
    stateManager.state.language = 'en';

    const translation = i18nManager.getTranslation('unknownKey');
    expect(translation).toBe('unknownKey');
  });

  it('should return translation of the key if alias is given', () => {
    // Set current language to French (where 'unknownKey' does not exist)
    stateManager.state.language = 'fr';

    i18nManager.addTranslationAlias('layer', 'layerAlias');
    const translation = i18nManager.getTranslation('layerAlias');
    expect(translation).toBe('couche');
  });
});

describe('I18nManager.translate', () => {
  let i18nManager: I18nManager;
  let stateManager: StateManager;
  let context: IGirafeContext;

  beforeEach(() => {
    context = MockHelper.startMocking();
    // @ts-expect-error: private property
    context.i18nManager.translations = {
      fr: { layer: 'couche', map: 'carte' },
      en: { layer: 'layer', map: 'map' }
    };
    i18nManager = context.i18nManager;
    // @ts-ignore
    i18nManager.loadingLanguagePromise = 'not-null';
    stateManager = context.stateManager;
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should translate elements with i18n attribute', async () => {
    const div = document.createElement('div');
    div.innerHTML = '<span id="d1" i18n="layer"></span><div id="d2" i18n="map"></div>';
    const doc = new DocumentFragment();
    doc.appendChild(div);

    stateManager.state.language = 'fr';
    await i18nManager.translate(doc);

    const spanElement = doc.getElementById('d1');
    const divElement = doc.getElementById('d2');
    expect(spanElement?.innerHTML).toBe('couche');
    expect(divElement?.innerHTML).toBe('carte');
  });

  it('should not translate elements without i18n attribute', async () => {
    const div = document.createElement('div');
    div.innerHTML = '<span id="d1"></span><div id="d2"></div>';
    const doc = new DocumentFragment();
    doc.appendChild(div);

    stateManager.state.language = 'fr';
    await i18nManager.translate(doc);

    const spanElement = doc.getElementById('d1');
    const divElement = doc.getElementById('d2');
    expect(spanElement?.innerHTML).toBe('');
    expect(divElement?.innerHTML).toBe('');
  });

  it('should handle elements with i18nFn attribute', async () => {
    const div = document.createElement('div');
    div.innerHTML = '<span id="d1" i18nFn="formatNumber" i18n="12345.67"></span>';
    const doc = new DocumentFragment();
    doc.appendChild(div);

    await i18nManager.translate(doc);

    const spanElement = doc.getElementById('d1');
    expect(spanElement?.innerHTML).toBe('12,345.67');
  });

  it('should handle elements with placeholder attribute', async () => {
    const div = document.createElement('div');
    div.innerHTML = '<input type="text" placeholder="layer" i18n="layer">';
    const doc = new DocumentFragment();
    doc.appendChild(div);

    stateManager.state.language = 'fr';
    await i18nManager.translate(doc);

    const inputElement = doc.querySelector('input');
    expect(inputElement?.getAttribute('placeholder')).toBe('couche');
  });
});

describe('I18nManager.formatNumber', () => {
  let i18nManager: I18nManager;
  let configManager: ConfigManager;
  let context: IGirafeContext;

  beforeEach(() => {
    context = MockHelper.startMocking();
    i18nManager = context.i18nManager;
    configManager = context.configManager;
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should format integer number according to locale', () => {
    configManager.Config.general.locale = 'en-US';
    // @ts-expect-error: private property
    const formatted = i18nManager.formatNumber(12345);
    expect(typeof formatted).toEqual('string');
    expect(formatted).toBe('12,345');
  });

  it('should format floating point number according to locale', () => {
    configManager.Config.general.locale = 'fr-FR';
    // @ts-expect-error: private property
    const formatted = i18nManager.formatNumber(123.45);
    expect(typeof formatted).toEqual('string');
    expect(formatted).toBe('123,45');
  });

  it('should return NaN string for non-numeric input', () => {
    configManager.Config.general.locale = 'en-US';
    // @ts-expect-error: private property
    const formatted = i18nManager.formatNumber('abc123');
    expect(formatted).toBe('NaN');
  });
});
