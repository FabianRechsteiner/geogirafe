import { describe, expect, it } from 'vitest';
import {
  createObjectFromPath,
  deletePropertyByPath,
  getPropertyByPath,
  setPropertyByPath,
  mergeObjects
} from './pathUtils';

describe('pathUtils.getPropertyPath', () => {
  it('getPropertyByPath should get property by path', () => {
    const obj = {
      nested: {
        property: 'value'
      }
    };
    const result = getPropertyByPath(obj, 'nested.property');
    expect(result).toEqual({ found: true, object: 'value', parentObject: obj.nested, lastKey: 'property' });
  });

  it('getPropertyByPath should get property by path if value is null', () => {
    const obj = {
      nested: {
        property: null
      }
    };
    const result = getPropertyByPath(obj, 'nested.property');
    expect(result).toEqual({ found: true, object: null, parentObject: obj.nested, lastKey: 'property' });
  });

  it('getPropertyByPath should get property by path if value is undefined', () => {
    const obj = {
      nested: {
        property: undefined
      }
    };
    const result = getPropertyByPath(obj, 'nested.property');
    expect(result).toEqual({ found: true, object: undefined, parentObject: obj.nested, lastKey: 'property' });
  });

  it('getPropertyByPath should handle empty path', () => {
    const obj = { key: 'value' };
    const result = getPropertyByPath(obj, '');
    expect(result).toEqual({ found: true, object: obj, parentObject: null, lastKey: null });
  });

  it('getPropertyByPath should handle non-existent path', () => {
    const obj = { key: 'value' };
    const result = getPropertyByPath(obj, 'nonexistent.property');
    expect(result).toEqual({ found: false, object: null, parentObject: null, lastKey: null });
  });

  it('getPropertyByPath should handle non-existent nested path', () => {
    const obj = { key: 'value' };
    const result = getPropertyByPath(obj, 'nested.property');
    expect(result).toEqual({ found: false, object: null, parentObject: null, lastKey: null });
  });

  it('getPropertyByPath should handle array indices', () => {
    const obj = {
      array: [{ value: 1 }, { value: 2 }, { value: 3 }]
    };
    const result = getPropertyByPath(obj, 'array.1.value');
    expect(result).toEqual({ found: true, object: 2, parentObject: obj.array[1], lastKey: 'value' });
  });

  it('getPropertyByPath should handle mixed path', () => {
    const obj = {
      nested: {
        array: [{ value: 'a' }, { value: 'b' }, { value: 'c' }]
      }
    };
    const result = getPropertyByPath(obj, 'nested.array.2.value');
    expect(result).toEqual({ found: true, object: 'c', parentObject: obj.nested.array[2], lastKey: 'value' });
  });
});

describe('pathUtils.setPropertyPath', () => {
  it('setPropertyByPath should set property by path', () => {
    const obj = {
      nested: {
        property: 'value'
      }
    };
    const result = setPropertyByPath(obj, 'nested.property', 'valueSet');
    expect(result).toBeTruthy();
    expect(obj.nested.property).toBe('valueSet');
  });

  it('setPropertyByPath should not set property on emptyPath', () => {
    const obj = {
      nested: {
        property: 'value'
      }
    };
    const result = setPropertyByPath(obj, '', 'valueSet');
    expect(result).toBeFalsy();
    expect(obj.nested.property).toBe('value');
  });
});

describe('pathUtils.objectFromPath', () => {
  it('should create an object from a paths', () => {
    const result = createObjectFromPath('this.is.a.test.path');
    expect(result).toEqual({ this: { is: { a: { test: { path: {} } } } } });
  });

  it('should handle empty paths', () => {
    const result = createObjectFromPath('');
    expect(Object.keys(result).length).toBe(0);
  });

  it('should handle questionable paths', () => {
    let result = createObjectFromPath('questionable..path');
    expect(result).toEqual({ questionable: { path: {} } });

    result = createObjectFromPath('..questionable.path');
    expect(result).toEqual({ questionable: { path: {} } });

    result = createObjectFromPath('.questionable.path.');
    expect(result).toEqual({ questionable: { path: {} } });

    result = createObjectFromPath('questionable.0.path');
    expect(result).toEqual({ questionable: { 0: { path: {} } } });

    result = createObjectFromPath('questionable.undefined.path');
    expect(result).toEqual({ questionable: { undefined: { path: {} } } });

    result = createObjectFromPath('questionable.null.path');
    expect(result).toEqual({ questionable: { null: { path: {} } } });

    result = createObjectFromPath('questionable.NaN.path');
    expect(result).toEqual({ questionable: { NaN: { path: {} } } });

    result = createObjectFromPath('questionable.-1.path');
    expect(result).toEqual({ questionable: { ['-1']: { path: {} } } });

    result = createObjectFromPath('questionable.-.path');
    expect(result).toEqual({ questionable: { ['-']: { path: {} } } });

    result = createObjectFromPath('questionable./.path');
    expect(result).toEqual({ questionable: { ['/']: { path: {} } } });
  });
});

describe('pathUtils.objectFromPath', () => {
  it('should delete a deeply nested object and all its predecessors', () => {
    const obj = { level1: { level2: { level3: { level4: { level5: 42 } } } } };
    deletePropertyByPath(obj, 'level1.level2.level3.level4.level5');
    expect(Object.keys(obj).length).toBe(0);
  });

  it('should not delete a deeply nested object until a predecessors has additional properties', () => {
    const obj = { level1: { level2: { level3: { level4: { level5: 42 } } }, siblingOnLevel2: 43 } };
    deletePropertyByPath(obj, 'level1.level2.level3.level4.level5');
    expect(Object.keys(obj.level1).length).toBe(1);
    expect(obj.level1.siblingOnLevel2).toBe(43);
    expect(Object.keys(obj.level1)).toEqual(['siblingOnLevel2']);
  });

  it('should ignore incorrect paths', () => {
    const obj = { level1: { level2: { level3: { level4: { level5: 42 } } } } };
    deletePropertyByPath(obj, 'level1.level2.level999.level4.level5');
    expect(obj['level1']['level2']['level3']['level4']['level5']).toBe(42);
  });

  it('should handle emtpy objects', () => {
    const obj = {};
    deletePropertyByPath(obj, 'level1.level2.level3.level4.level5');
    expect(Object.keys(obj).length).toBe(0);
  });

  it('should handle an incorrect property', () => {
    const obj = { level1: { level2: { level3: { level4: { level5: 42 } } } } };
    deletePropertyByPath(obj, 'level1.level2.level3.level4.level999');
    expect(obj['level1']['level2']['level3']['level4']['level5']).toBe(42);
  });
});

describe('pathUtils.mergeObjects', () => {
  it('should merge two empty objects', () => {
    const obj1 = {};
    const obj2 = {};
    // @ts-ignore
    const result = mergeObjects(obj1, obj2);
    expect(result).toEqual({});
  });

  it('should merge two objects with no common properties', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { c: 3, d: 4 };
    // @ts-ignore
    const result = mergeObjects(obj1, obj2);
    expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  it('should merge two objects with common properties', () => {
    const obj1 = { a: 1, b: 2, c: { x: 1, y: 2 } };
    const obj2 = { b: 3, c: { y: 4, z: 5 }, d: 4 };
    // @ts-ignore
    const result = mergeObjects(obj1, obj2);
    expect(result).toEqual({ a: 1, b: 3, c: { x: 1, y: 4, z: 5 }, d: 4 });
  });

  it('should merge two objects with nested common properties', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { d: 2 } } };
    // @ts-ignore
    const result = mergeObjects(obj1, obj2);
    expect(result).toEqual({ a: { b: { c: 1, d: 2 } } });
  });

  it('should merge two objects with nested non-common properties', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { d: 2 } };
    // @ts-ignore
    const result = mergeObjects(obj1, obj2);
    expect(result).toEqual({ a: { b: { c: 1 }, d: 2 } });
  });
});
