import { describe, expect, it } from 'vitest';
import areEqual from './equality';
import { v4 as uuidv4 } from 'uuid';

describe('Equality.areEqual', () => {
  it('areEqual should compare numbers', () => {
    expect(areEqual(42, 42)).toBe(true);
    expect(areEqual(42, 43)).toBe(false);
    expect(areEqual(42, '43')).toBe(false);
    expect(areEqual(42, NaN)).toBe(false);
    expect(areEqual(42, null)).toBe(false);
    expect(areEqual(42, undefined)).toBe(false);
    expect(areEqual(NaN, NaN)).toBe(false);
  });

  it('areEqual should compare strings', () => {
    expect(areEqual('abc', 'abc')).toBe(true);
    expect(areEqual('42', 42)).toBe(false);
    expect(areEqual('abc', 'defg')).toBe(false);
    expect(areEqual('abc', null)).toBe(false);
    expect(areEqual('abc', undefined)).toBe(false);
  });

  it('areEqual should compare dates', () => {
    expect(areEqual(new Date(2011, 5, 26), new Date(2011, 5, 26))).toBe(true);
    expect(areEqual(new Date(2011, 5, 26), new Date(2009, 5, 1))).toBe(false);
    expect(areEqual(new Date(2011, 5, 26), null)).toBe(false);
    expect(areEqual(new Date(2011, 5, 26), undefined)).toBe(false);
  });

  it('areEqual should compare bigint', () => {
    expect(areEqual(321654987n, 321654987n)).toBe(true);
    expect(areEqual(321654987n, 963852741n)).toBe(false);
    expect(areEqual(321654987n, null)).toBe(false);
    expect(areEqual(321654987n, undefined)).toBe(false);
    expect(areEqual(321654987n, 321654987)).toBe(false);
    expect(areEqual(321654987n, '321654987n')).toBe(false);
  });

  it('areEqual should compare booleans', () => {
    expect(areEqual(true, true)).toBe(true);
    expect(areEqual(false, false)).toBe(true);
    expect(areEqual(true, false)).toBe(false);
    expect(areEqual(true, undefined)).toBe(false);
    expect(areEqual(true, null)).toBe(false);
    expect(areEqual(false, undefined)).toBe(false);
    expect(areEqual(false, null)).toBe(false);
  });

  it('areEqual should compare null and undefined values', () => {
    expect(areEqual(null, null)).toBe(true);
    expect(areEqual(undefined, undefined)).toBe(true);
    expect(areEqual(null, undefined)).toBe(false);
  });

  it('areEqual should compare arrays', () => {
    expect(areEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(areEqual([1, 2, 3], [1, 2, 3, 4])).toBe(false);
    expect(areEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(areEqual([1, 2, 3], [3, 1, 2])).toBe(false);
    expect(areEqual([1, 2, 3], null)).toBe(false);
    expect(areEqual([1, 2, 3], undefined)).toBe(false);
    expect(areEqual([], [])).toBe(true);
    expect(areEqual([], false)).toBe(false);
  });

  it('areEqual should compare objects', () => {
    expect(areEqual({ key: 'value' }, { key: 'value' })).toBe(true);
    expect(areEqual({ key: 'value' }, { key: 'anotherValue' })).toBe(false);
    expect(areEqual({ key: 'value' }, { anotherKey: 'value' })).toBe(false);
    expect(areEqual({}, {})).toBe(true);
  });

  it('areEqual should handle circular references for different objects', () => {
    const layer1: any = { group: null, val: 1 };
    const layer2: any = { group: null, val: 2 };
    const group = {
      layers: [layer1, layer2],
      val: 0
    };
    layer1.group = group;
    layer2.group = group;

    expect(areEqual(group, group)).toBe(true);
    expect(areEqual(layer1, layer1)).toBe(true);
    expect(areEqual(layer2, layer2)).toBe(true);
    expect(areEqual(layer1, layer2)).toBe(false);
  });

  it('areEqual should handle circular references for equal objects', () => {
    const layer1: any = { group: null, val: 1 };
    const layer2: any = { group: null, val: 1 };
    const group = {
      layers: [layer1, layer2],
      val: 0
    };
    layer1.group = group;
    layer2.group = group;

    expect(areEqual(group, group)).toBe(true);
    expect(areEqual(layer1, layer1)).toBe(true);
    expect(areEqual(layer2, layer2)).toBe(true);
    expect(areEqual(layer1, layer2)).toBe(true);
  });

  it('should ignore properties starting with an underscore for equal objects', () => {
    const layer1: any = { group: null, val: 1, _id: 'toto' };
    const layer2: any = { group: null, val: 1, _id: 'tutu' };

    expect(areEqual(layer1, layer2)).toBe(true);
  });

  it('should ignore properties starting with an underscore for different objects', () => {
    const layer1: any = { group: null, val: 1, _id: 'toto' };
    const layer2: any = { group: null, val: 2, _id: 'tutu' };

    expect(areEqual(layer1, layer2)).toBe(false);
  });
});

describe('areEqual Performance Tests', () => {
  function createLargeObject(size: number) {
    let obj: Record<string, any> = {};
    for (let i = 0; i < size; i++) {
      obj[`key${i}_nul`] = i;
      obj[`key${i}_string`] = `test_string${i}`;
      obj[`_key${i}_ign`] = uuidv4();
      obj[`key${i}_map`] = { key: i, layer: 'layer1', array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
      obj[`key${i}_arr`] = [...Array(1000)].map((_, i) => `string${i + 1}`);
      obj[`_key${i}_dat`] = new Date(1980, 2, 22, 12, 45, 23);
    }
    return obj;
  }

  it('should handle small objects quickly', () => {
    const obj1 = { a: 1, b: 2, c: { d: 3 } };
    const obj2 = { a: 1, b: 2, c: { d: 3 } };

    const start = performance.now();
    const result = areEqual(obj1, obj2);
    const end = performance.now();

    expect(result).toBe(true);
    console.log(`Small objects comparison time: ${end - start}ms`);
  });

  it('should handle large objects efficiently', () => {
    const largeObj1 = createLargeObject(10000);
    const largeObj2 = createLargeObject(10000);

    const start = performance.now();
    const result = areEqual(largeObj1, largeObj2);
    const end = performance.now();

    expect(result).toBe(true);
    console.log(`Large objects comparison time: ${end - start}ms`);
  });

  it('should handle deep nested objects', () => {
    const nestedObj1 = { a: { b: { c: { d: { e: 1 } } } } };
    const nestedObj2 = { a: { b: { c: { d: { e: 1 } } } } };

    const start = performance.now();
    const result = areEqual(nestedObj1, nestedObj2);
    const end = performance.now();

    expect(result).toBe(true);
    console.log(`Deep nested objects comparison time: ${end - start}ms`);
  });
});
