import { describe, it, expect } from 'vitest';
import GirafeSingleton from './GirafeSingleton';
import MockHelper from '../tools/tests/mockhelper';

describe('GirafeSingleton.isNullOrUndefinedOrBlank', () => {
  const context = MockHelper.startMocking();

  it('isNullOrUndefinedOrBlank tests', () => {
    class TestSingleton extends GirafeSingleton {}
    const instance = new TestSingleton(context);
    // @ts-expect-error: private property
    expect(instance.isNullOrUndefinedOrBlank(undefined)).toBe(true);
    // @ts-expect-error: private property
    expect(instance.isNullOrUndefinedOrBlank(null)).toBe(true);
    // @ts-expect-error: private property
    expect(instance.isNullOrUndefinedOrBlank('')).toBe(true);
    // @ts-expect-error: private property
    expect(instance.isNullOrUndefinedOrBlank(0)).toBe(false);
    // @ts-expect-error: private property
    expect(instance.isNullOrUndefinedOrBlank(false)).toBe(false);
    // @ts-expect-error: private property
    expect(instance.isNullOrUndefinedOrBlank('string')).toBe(false);
    // @ts-expect-error: private property
    expect(instance.isNullOrUndefinedOrBlank({})).toBe(false);
    // @ts-expect-error: private property
    expect(instance.isNullOrUndefinedOrBlank([])).toBe(false);
  });
});
