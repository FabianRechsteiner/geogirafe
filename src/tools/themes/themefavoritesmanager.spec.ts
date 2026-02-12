import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import ThemeFavoritesManager from './themefavoritesmanager';
import IGirafeContext from '../context/icontext';
import MockHelper from '../tests/mockhelper';
import ThemeLayer from '../../models/layers/themelayer';
import CustomTheme from '../../models/customtheme';

let themeFavoritesManager: ThemeFavoritesManager;
let context: IGirafeContext;

const storagePath = 'themeFavorites';
const themeLayer: ThemeLayer = new ThemeLayer(42, "ThemeLayer", 1);
const customTheme: CustomTheme = new CustomTheme("CustomTheme");

beforeAll(() => {
  context = MockHelper.startMocking();
  themeFavoritesManager = context.themeFavoritesManager;
});
beforeEach(() => {
  context.userDataManager.deleteAllUserData();
  themeFavoritesManager.clearThemeFavorites();
});

describe('ThemeFavoritesManager.addThemeToFavorites', () => {
  it('adding a ThemeLayer should result in an number array', () => {
    themeFavoritesManager.addThemeToFavorites(themeLayer);

    expect(context.userDataManager.getUserData(storagePath)).toEqual(`[${themeLayer.id}]`);
  });

  it('adding a CustomTheme should result in an string array', () => {
    themeFavoritesManager.addThemeToFavorites(customTheme);

    expect(context.userDataManager.getUserData(storagePath)).toEqual(`["${customTheme.name}"]`);
  });

  it('adding a ThemeLayer and a CustomTheme should result in an mixed array', () => {
    themeFavoritesManager.addThemeToFavorites(themeLayer);
    themeFavoritesManager.addThemeToFavorites(customTheme);

    expect(context.userDataManager.getUserData(storagePath)).toEqual(`[${themeLayer.id},"${customTheme.name}"]`);
  });
});

describe('ThemeFavoritesManager.initializeSingleton', () => {
  it('starting without persisted favorites should result in an empty array', () => {
    themeFavoritesManager.initializeSingleton();
    expect(themeFavoritesManager.getThemeFavorites()).toEqual([]);
  });

  it('starting with an empty string as persisted data  should result in an empty array', () => {
    context.userDataManager.saveUserData(storagePath, '');
    themeFavoritesManager.initializeSingleton();

    expect(themeFavoritesManager.getThemeFavorites()).toEqual([]);
  });

  it('starting with "[42]" as persisted data should result in [42]', () => {
    context.userDataManager.saveUserData(storagePath, '[42]');
    themeFavoritesManager.initializeSingleton();

    expect(themeFavoritesManager.getThemeFavorites()).toEqual([42]);
  });

  it('starting with "["CustomTheme""]" as persisted data should result in ["CustomTheme"]', () => {
    context.userDataManager.saveUserData(storagePath, '["CustomTheme"]');
    themeFavoritesManager.initializeSingleton();

    expect(themeFavoritesManager.getThemeFavorites()).toEqual(['CustomTheme']);
  });

  it('starting with "[42,"CustomTheme""]" as persisted data should result in [42,"CustomTheme"]', () => {
    context.userDataManager.saveUserData(storagePath, '[42,"CustomTheme"]');
    themeFavoritesManager.initializeSingleton();

    expect(themeFavoritesManager.getThemeFavorites()).toEqual([42, 'CustomTheme']);
  });
});

describe('ThemeFavoritesManager.isThemeInFavorites', () => {
  it('adding ThemeLayer should result in ThemeLayer being a favorite', () => {
    themeFavoritesManager.addThemeToFavorites(themeLayer);

    expect(themeFavoritesManager.isThemeInFavorites(themeLayer)).toBeTruthy();
  });

  it('adding CustomTheme should result in CustomTheme being a favorite', () => {
    themeFavoritesManager.addThemeToFavorites(customTheme);

    expect(themeFavoritesManager.isThemeInFavorites(customTheme)).toBeTruthy();
  });

  it('adding CustomTheme should result in ThemeLayer being not a favorite', () => {
    themeFavoritesManager.addThemeToFavorites(customTheme);

    expect(themeFavoritesManager.isThemeInFavorites(themeLayer)).toBeFalsy();
  });

  it('adding ThemeLayer should result in CustomTheme being not a favorite', () => {
    themeFavoritesManager.addThemeToFavorites(themeLayer);

    expect(themeFavoritesManager.isThemeInFavorites(customTheme)).toBeFalsy();
  });

  it('adding ThemeLayer and CustomTheme should result in both being a favorite', () => {
    themeFavoritesManager.addThemeToFavorites(themeLayer);
    themeFavoritesManager.addThemeToFavorites(customTheme);

    expect(themeFavoritesManager.isThemeInFavorites(themeLayer)).toBeTruthy();
    expect(themeFavoritesManager.isThemeInFavorites(customTheme)).toBeTruthy();
  });
});

describe('ThemeFavoritesManager.clearThemeFavorites', () => {
  it('clearing favorites should result in an empty array', () => {
    context.userDataManager.saveUserData(storagePath, '[42,"CustomTheme"]');
    themeFavoritesManager.initializeSingleton();

    expect(themeFavoritesManager.getThemeFavorites().length).toEqual(2);
    themeFavoritesManager.clearThemeFavorites();
    expect(themeFavoritesManager.getThemeFavorites().length).toEqual(0);
  });
});

describe('ThemeFavoritesManager.addOrRemoveThemeFromFavorites', () => {
  it('not already being a favorite should result in being a favorite afterwards ', () => {
    themeFavoritesManager.addOrRemoveThemeFromFavorites(themeLayer);

    expect(themeFavoritesManager.isThemeInFavorites(themeLayer)).toBeTruthy();
  });

  it('already being a favorite should result in no longer being a favorite afterwards ', () => {
    context.userDataManager.saveUserData(storagePath, '[42]');
    themeFavoritesManager.initializeSingleton();
    themeFavoritesManager.addOrRemoveThemeFromFavorites(themeLayer);

    expect(themeFavoritesManager.isThemeInFavorites(themeLayer)).toBeFalsy();
  });
});