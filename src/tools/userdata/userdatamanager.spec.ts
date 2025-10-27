import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import MockHelper from '../tests/mockhelper';
import IGirafeContext from '../context/icontext';
import UserDataManager from './userdatamanager';

describe('UserDataManager.getUserData', () => {
  let context: IGirafeContext;
  let manager: UserDataManager;

  beforeAll(() => {
    context = MockHelper.startMocking();
    manager = context.userDataManager;
    manager.setSource('localStorage');
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
    manager.deleteAllUserData();
  });

  beforeEach(() => {
    manager.deleteAllUserData();
  });

  it('should retrieve data from the specified path in storage', () => {
    const path = 'userPreferences.language';
    const value = 'en-US';
    manager.saveUserData(path, value);

    const result = manager.getUserData(path);
    expect(result).toBe(value);
  });

  it('should return undefined if the path does not exist in storage', () => {
    const result = manager.getUserData('non.existent.path');
    expect(result).toBeUndefined();
  });
});

describe('UserDataManager.saveUserData', () => {
  let context: IGirafeContext;
  let manager: UserDataManager;
  let configPath: string;

  beforeAll(() => {
    context = MockHelper.startMocking();
    manager = context.userDataManager;
    configPath = context.configManager['storagePathForOverrides'];
    manager.setSource('localStorage');
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
    manager.deleteAllUserData();
  });

  beforeEach(() => {
    manager.deleteAllUserData();
  });

  it('should save user data in storage by providing a path and simple value', () => {
    const path = `${configPath}.basemaps.defaultBasemap`;
    const newValue = Math.random().toFixed(4).toString();
    manager.saveUserData(path, newValue);
    const savedUserData = manager.getUserData(configPath);
    expect(savedUserData).not.toBeNull();
    // @ts-ignore
    expect(savedUserData.basemaps.defaultBasemap).toBe(newValue);
  });

  it('should overwrite user data in storage by providing a path and simple value', () => {
    const path = `${configPath}.basemaps.defaultBasemap`;
    const newValue = 22;
    manager.saveUserData(path, newValue);
    const storageContent = manager['load'](false);
    // @ts-ignore
    expect(storageContent[configPath].basemaps.defaultBasemap).toBe(newValue);

    const updatedValue = 33;
    manager.saveUserData(path, updatedValue);
    const updatedStorage = manager['load'](false);
    // @ts-ignore
    expect(updatedStorage[configPath].basemaps.defaultBasemap).toBe(updatedValue);
  });

  it('should overwrite user data in storage by providing a path and object', () => {
    const customThemesPath = context.customThemesManager['storagePath'];
    const customThemes = { theme1: [], theme2: [{ c: 1, e: 0, i: 2345, o: 3456 }] };
    manager.saveUserData(customThemesPath, customThemes);

    const storageContent = manager['load'](false);
    // @ts-ignore
    expect(storageContent[customThemesPath].theme2.length).toEqual(1);

    // Now update the custom themes
    const updatedCustomThemes = { ...customThemes, theme3: [] };
    // @ts-ignore
    delete updatedCustomThemes['theme2'];
    manager.saveUserData(customThemesPath, updatedCustomThemes);

    const updatedStorage = manager['load'](false);
    // @ts-ignore
    expect(updatedStorage[customThemesPath].theme3.length).toEqual(0);
    // @ts-ignore
    expect(Object.keys(updatedStorage[customThemesPath])).toEqual(['theme1', 'theme3']);
  });
});

describe('UserDataManager.deleteUserData', () => {
  let context: IGirafeContext;
  let manager: UserDataManager;

  beforeAll(() => {
    context = MockHelper.startMocking();
    manager = context.userDataManager;
    manager.setSource('localStorage');
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
    manager.deleteAllUserData();
  });

  beforeEach(() => {
    manager.deleteAllUserData();
  });

  it('should delete data from the specified path in storage', () => {
    const path1 = 'userPreferences.language';
    const value1 = 'en-US';
    manager.saveUserData(path1, value1);
    const path2 = 'userPreferences.some.other.path';
    const value2 = ['this', 'is', 'a', 'list'];
    manager.saveUserData(path2, value2);

    manager.deleteUserData(path1);

    const dataInStorage = manager['load'](false);

    // @ts-ignore
    expect(dataInStorage.userPreferences.language).toBeUndefined();
    // @ts-ignore
    expect(dataInStorage.userPreferences.some.other.path).toEqual(value2);
  });

  it('should not raise an exception if the path does not exist in storage', () => {
    expect(() => {
      manager.deleteUserData('non.existent.path');
    }).not.toThrowError();
  });
});

describe('UserDataManager.deleteAllUserData', () => {
  let context: IGirafeContext;
  let manager: UserDataManager;

  beforeAll(() => {
    context = MockHelper.startMocking();
    manager = context.userDataManager;
    manager.setSource('localStorage');
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
    manager.deleteAllUserData();
  });

  it('should delete all user data in storage', () => {
    manager.saveUserData('user.preferences.language', 'en-US');
    manager.saveUserData('user.preferences.colorScheme', 'blue');

    manager.deleteAllUserData();

    expect(manager.getUserData('user.preferences.language')).toBeUndefined();
    expect(manager.getUserData('user.preferences.colorScheme')).toBeUndefined();
    expect(Object.keys(manager['load'](false))).toEqual([]);
  });
});
