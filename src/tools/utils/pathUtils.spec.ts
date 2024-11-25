import { describe, expect, it } from 'vitest';
import { createObjectFromPath, getPropertyByPath, setPropertyByPath } from './pathUtils';

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
