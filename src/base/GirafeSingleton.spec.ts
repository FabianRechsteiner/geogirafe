import { describe, it, expect } from 'vitest';
import GirafeSingleton from './GirafeSingleton';
import MockHelper from '../tools/tests/mockhelper';

describe('GirafeSingleton.isNullOrUndefinedOrBlank', () => {
  const context = MockHelper.startMocking();

  it('isNullOrUndefinedOrBlank tests', () => {
    class TestSingleton extends GirafeSingleton {}
    const instance = new TestSingleton(context);
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
