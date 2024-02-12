import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import StateManager from './statemanager';
import State from './state';
import onChange from 'on-change';
import Theme from '../../models/theme';
import LayerOsm from '../../models/layers/layerosm';
import MockHelper from '../tests/mockhelper';

let manager: StateManager;

beforeAll(() => {
  MockHelper.startMocking();
  manager = StateManager.getInstance();
});

afterAll(() => {
  MockHelper.stopMocking();
});

describe('StateManager.getCircularReplacer', () => {
  it('should replace circular references with [Circular]', () => {
    const circularObject: any = {};
    circularObject.circularReference = circularObject;
    const jsonString = JSON.stringify(circularObject, manager.getCircularReplacer());

    const expectedString = '{"circularReference":"[Circular]"}';
    expect(jsonString).toEqual(expectedString);
  });

  it('should not replace non-circular references', () => {
    const nonCircularObject = { key: 'value' };
    const jsonString = JSON.stringify(nonCircularObject, manager.getCircularReplacer());

    const expectedString = '{"key":"value"}';
    expect(jsonString).toEqual(expectedString);
  });

  it('should handle arrays with circular references', () => {
    const circularArray: any[] = [];
    circularArray.push(circularArray);
    const jsonString = JSON.stringify(circularArray, manager.getCircularReplacer());

    const expectedString = '["[Circular]"]';
    expect(jsonString).toEqual(expectedString);
  });

  it('should handle arrays without circular references', () => {
    const nonCircularArray = [1, 2, 3];
    const jsonString = JSON.stringify(nonCircularArray, manager.getCircularReplacer());

    const expectedString = '[1,2,3]';
    expect(jsonString).toEqual(expectedString);
  });

  it('should not replace non-object values', () => {
    const primitiveValue = 42;
    const jsonString = JSON.stringify(primitiveValue, manager.getCircularReplacer());

    expect(jsonString).toEqual('42');
  });
});

describe('StateManager.areEqual', () => {
  it('areEqual should compare equal numbers', () => {
    expect(manager.areEqual(42, 42)).toBe(true);
  });

  it('areEqual should compare different numbers', () => {
    expect(manager.areEqual(42, 43)).toBe(false);
  });

  it('areEqual should compare NaN numbers', () => {
    expect(manager.areEqual(NaN, NaN)).toBe(true);
  });

  it('areEqual should compare equal strings', () => {
    expect(manager.areEqual('abc', 'abc')).toBe(true);
  });

  it('areEqual should compare different strings', () => {
    expect(manager.areEqual('abc', 'def')).toBe(false);
  });

  it('areEqual should compare equal booleans', () => {
    expect(manager.areEqual(true, true)).toBe(true);
  });

  it('areEqual should compare different booleans', () => {
    expect(manager.areEqual(true, false)).toBe(false);
  });

  it('areEqual should compare null values', () => {
    expect(manager.areEqual(null, null)).toBe(true);
  });

  it('areEqual should compare undefined values', () => {
    expect(manager.areEqual(undefined, undefined)).toBe(true);
  });

  it('areEqual should compare null and undefined values', () => {
    expect(manager.areEqual(null, undefined)).toBe(false);
  });

  it('areEqual should compare equal arrays', () => {
    const arr1 = [1, 2, 3];
    const arr2 = [1, 2, 3];
    expect(manager.areEqual(arr1, arr2)).toBe(true);
  });

  it('areEqual should compare different arrays', () => {
    const arr1 = [1, 2, 3];
    const arr2 = [3, 2, 1];
    expect(manager.areEqual(arr1, arr2)).toBe(false);
  });

  it('areEqual should compare equal objects', () => {
    const obj1 = { key: 'value' };
    const obj2 = { key: 'value' };
    expect(manager.areEqual(obj1, obj2)).toBe(true);
  });

  it('areEqual should compare different objects', () => {
    const obj1 = { key: 'value' };
    const obj2 = { key: 'differentValue' };
    expect(manager.areEqual(obj1, obj2)).toBe(false);
  });

  it('2 empty state should be the equal', () => {
    const obj1 = new State();
    const obj2 = new State();
    expect(manager.areEqual(obj1, obj2)).toBe(true);
  });

  it('areEqual should handle circular references', () => {
    const layer1: any = { group: null, val: 1 };
    const layer2: any = { group: null, val: 2 };
    const group = {
      layers: [layer1, layer2],
      val: 0
    };
    layer1.group = group;
    layer2.group = group;

    expect(manager.areEqual(group, group)).toBe(true);
    expect(manager.areEqual(layer1, layer1)).toBe(true);
    expect(manager.areEqual(layer2, layer2)).toBe(true);
    expect(manager.areEqual(layer1, layer2)).toBe(false);
  });
});

describe('StateManager.getPropertyPath', () => {
  it('getPropertyByPath should get property by path', () => {
    const obj = {
      nested: {
        property: 'value'
      }
    };
    const result = manager.getPropertyByPath(obj, 'nested.property');
    expect(result).toEqual({ found: true, object: 'value' });
  });

  it('getPropertyByPath should get property by path if value is null', () => {
    const obj = {
      nested: {
        property: null
      }
    };
    const result = manager.getPropertyByPath(obj, 'nested.property');
    expect(result).toEqual({ found: true, object: null });
  });

  it('getPropertyByPath should get property by path if value is undefined', () => {
    const obj = {
      nested: {
        property: undefined
      }
    };
    const result = manager.getPropertyByPath(obj, 'nested.property');
    expect(result).toEqual({ found: true, object: undefined });
  });

  it('getPropertyByPath should handle empty path', () => {
    const obj = { key: 'value' };
    const result = manager.getPropertyByPath(obj, '');
    expect(result).toEqual({ found: true, object: obj });
  });

  it('getPropertyByPath should handle non-existent path', () => {
    const obj = { key: 'value' };
    const result = manager.getPropertyByPath(obj, 'nonexistent.property');
    expect(result).toEqual({ found: false, object: null });
  });

  it('getPropertyByPath should handle non-existent nested path', () => {
    const obj = { key: 'value' };
    const result = manager.getPropertyByPath(obj, 'nested.property');
    expect(result).toEqual({ found: false, object: null });
  });

  it('getPropertyByPath should handle array indices', () => {
    const obj = {
      array: [{ value: 1 }, { value: 2 }, { value: 3 }]
    };
    const result = manager.getPropertyByPath(obj, 'array.1.value');
    expect(result).toEqual({ found: true, object: 2 });
  });

  it('getPropertyByPath should handle mixed path', () => {
    const obj = {
      nested: {
        array: [{ value: 'a' }, { value: 'b' }, { value: 'c' }]
      }
    };
    const result = manager.getPropertyByPath(obj, 'nested.array.2.value');
    expect(result).toEqual({ found: true, object: 'c' });
  });
});

describe('StateManager.subscribe', () => {
  it('subscribe should call callback immediately if value is not null, undefined, empty object, or empty array', () => {
    let controlOldValue = undefined;
    let controlValue = undefined;
    let controlParent = undefined;
    const callback = (oldValue: any, value: any, parent: any) => {
      controlOldValue = oldValue;
      controlValue = value;
      controlParent = parent;
    };

    try {
      manager.state.language = 'fr';
      manager.subscribe('language', callback);
      expect(controlOldValue).toBe(null);
      expect(controlValue).toBe('fr');
      expect(controlParent).toEqual(manager.state);
    } finally {
      manager.unsubscribe(callback);
    }
  });

  it('subscribe should not call callback immediately if value is null', () => {
    let controlValue = 1;
    const callback = () => {
      controlValue = 2;
    };
    try {
      manager.state.language = null;
      manager.subscribe('language', callback);
      expect(controlValue).toEqual(1);
    } finally {
      manager.unsubscribe(callback);
    }
  });

  it('subscribe should not call callback immediately if value is empty object', () => {
    let controlValue = 1;
    const callback = () => {
      controlValue = 2;
    };
    try {
      manager.state.themes = {};
      manager.subscribe('themes', callback);
      expect(controlValue).toEqual(1);
    } finally {
      manager.unsubscribe(callback);
    }
  });

  it('subscribe should not call callback immediately if value is empty array', () => {
    let controlValue = 1;
    const callback = () => {
      controlValue = 2;
    };
    try {
      manager.state.mouseCoordinates = [];
      manager.subscribe('mouseCoordinates', callback);
      expect(controlValue).toEqual(1);
    } finally {
      manager.unsubscribe(callback);
    }
  });

  it('subscribe should NOT raise an exception if the property does not exist, because it can be a regular expression', () => {
    expect(() => {
      manager.subscribe('nonExistentProperty.subproperty', () => {});
    }).not.toThrowError();
    expect(() => {
      manager.subscribe(/nonExistentProperty\.subproperty/, () => {});
    }).not.toThrowError();
  });

  it('subscribe should support regular expressions for attributes', () => {
    let controlValue = 1;
    const callback = () => {
      controlValue = 2;
    };
    try {
      manager.subscribe(/.*\.helpVisible/, callback);
      expect(controlValue).toEqual(1);
      manager.state.interface.helpVisible = true;
      expect(controlValue).toEqual(2);
    } finally {
      manager.unsubscribe(callback);
    }
  });

  it('subscribe should support regular expressions for arrays', () => {
    let controlValue = 1;
    const callback = () => {
      controlValue = 2;
    };
    try {
      manager.state.extendedState = {
        arr: [{ visible: false }, { visible: false }, { visible: false }]
      };
      manager.subscribe(/extendedState\.arr\.[0-9]+\.visible/, callback);
      expect(controlValue).toEqual(1);
      // @ts-ignore
      manager.state.extendedState.arr[0].visible = true;
      expect(controlValue).toEqual(2);
    } finally {
      manager.unsubscribe(callback);
    }
  });

  it('subscribe should not listen to properties whose name begins with underscode', () => {
    let controlValue;
    const callback = () => {
      controlValue = 2;
    };
    try {
      const theme = new Theme({ id: 1, name: 'test', icon: 'iconpath' });
      theme._layersTree.push(new LayerOsm(0));
      manager.state.themes[theme.id] = theme;
      manager.subscribe(/.*/, callback);
      controlValue = 1;
      manager.state.themes[theme.id]._layersTree[0].name = 'new name';
      expect(controlValue).toEqual(1);
      manager.state.themes[theme.id].name = 'new name';
      expect(controlValue).toEqual(2);
    } finally {
      manager.unsubscribe(callback);
    }
  });
});

describe('StateManager.unsubscribe', () => {
  it('unsubscribe (one) should remove the specified callback', () => {
    let callback1Called = false;
    const callback1 = () => {
      callback1Called = true;
    };

    let callback2Called = false;
    const callback2 = () => {
      callback2Called = true;
    };

    try {
      manager.state.language = null;

      manager.subscribe('language', callback1);
      manager.subscribe('language', callback2);

      // Unsubscribe the first callback
      manager.unsubscribe(callback2);

      // Trigger a change event
      manager.state.language = 'fr';

      // Ensure only the second callback is called
      expect(callback1Called).toBe(true);
      expect(callback2Called).toBe(false);
    } finally {
      manager.unsubscribe(callback1);
    }
  });

  it('unsubscribe multiple should remove specific objects', () => {
    manager.state.language = null;
    let callback1Called = false;
    let callback2Called = false;
    let callback3Called = false;
    const callbacks = [
      manager.subscribe('language', () => {
        callback1Called = true;
      }),
      manager.subscribe('language', () => {
        callback2Called = true;
      })
    ];
    const callback3 = manager.subscribe('language', () => {
      callback3Called = true;
    });

    try {
      // UnsubscribeAll (1, 2)
      manager.unsubscribe(callbacks);

      // Trigger a change event
      manager.state.language = 'fr';

      // Ensure only the third callback is called
      expect(callback1Called).toBe(false);
      expect(callback2Called).toBe(false);
      expect(callback3Called).toBe(true);
    } finally {
      manager.unsubscribe(callback3);
    }
    expect(() => {
      manager.unsubscribe(() => {});
    }).toThrowError();
  });

  it('unsubscribe should throw an error if callback is not found', () => {
    expect(() => {
      manager.unsubscribe(() => {});
    }).toThrowError();
  });
});

describe('circular references (on-change)', () => {
  it('path should be the shorter one in the same object for circular references', () => {
    // This is the same test as added in the library on-change to deal with circular references
    const layer1: any = { group: null, val: 1 };
    const layer2: any = { group: null, val: 2 };
    const layer3: any = { group: null, val: 3 };
    const group = {
      layers: [layer1, layer2, layer3],
      val: 0
    };
    layer1.group = group;
    layer2.group = group;
    layer3.group = group;

    let resultPath = null;
    const proxy = onChange(group, (path) => {
      resultPath = path;
    });

    proxy.layers[0].val = 11;
    expect(resultPath).toEqual('layers.0.val');

    proxy.layers[0].group.val = 22;
    expect(resultPath).toEqual('layers.0.group.val');

    proxy.layers[0].group.layers[0].val = 33;
    expect(resultPath).toEqual('layers.0.val');

    proxy.layers[1].group.layers[0].group.layers[1].group.layers[1].group.layers[2].val = 33;
    expect(resultPath).toEqual('layers.2.val');
  });
});
