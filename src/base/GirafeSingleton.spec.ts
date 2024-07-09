import { describe, it, expect } from 'vitest';
import GirafeSingleton from './GirafeSingleton';

describe('GirafeSingleton.getInstance', () => {
  it('should throw error when directly instantiated', () => {
    expect(() => new GirafeSingleton('test')).toThrowError('This is a singleton. Please use the getInstance() method.');
  });

  it('should create a singleton instance using getInstance method', () => {
    class TestSingleton extends GirafeSingleton {}

    const instance1 = TestSingleton.getInstance();
    const instance2 = TestSingleton.getInstance();

    expect(instance1).toBe(instance2);
  });
});

describe('GirafeSingleton.isNullOrUndefined', () => {
  it('isNullOrUndefined tests', () => {
    class TestSingleton extends GirafeSingleton {}
    const instance = TestSingleton.getInstance();
    expect(instance.isNullOrUndefined(undefined)).toBe(true);
    expect(instance.isNullOrUndefined(null)).toBe(true);
    expect(instance.isNullOrUndefined('')).toBe(false);
    expect(instance.isNullOrUndefined(0)).toBe(false);
    expect(instance.isNullOrUndefined(false)).toBe(false);
    expect(instance.isNullOrUndefined('string')).toBe(false);
    expect(instance.isNullOrUndefined({})).toBe(false);
    expect(instance.isNullOrUndefined([])).toBe(false);
  });
});

describe('GirafeSingleton.isNullOrUndefinedOrBlank', () => {
  it('isNullOrUndefinedOrBlank tests', () => {
    class TestSingleton extends GirafeSingleton {}
    const instance = TestSingleton.getInstance();
    expect(instance.isNullOrUndefinedOrBlank(undefined)).toBe(true);
    expect(instance.isNullOrUndefinedOrBlank(null)).toBe(true);
    expect(instance.isNullOrUndefinedOrBlank('')).toBe(true);
    expect(instance.isNullOrUndefinedOrBlank(0)).toBe(false);
    expect(instance.isNullOrUndefinedOrBlank(false)).toBe(false);
    expect(instance.isNullOrUndefinedOrBlank('string')).toBe(false);
    expect(instance.isNullOrUndefinedOrBlank({})).toBe(false);
    expect(instance.isNullOrUndefinedOrBlank([])).toBe(false);
  });
});
