// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import StateManager from './statemanager';
import ThemeLayer from '../../models/layers/themelayer';
import LayerOsm from '../../models/layers/layerosm';
import MockHelper from '../tests/mockhelper';
import IGirafeContext from '../context/icontext';

let manager: StateManager;
let context: IGirafeContext;

beforeAll(() => {
  context = MockHelper.startMocking();
  manager = context.stateManager;
});

afterAll(() => {
  MockHelper.stopMocking(context);
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
      manager.state.basemaps = {};
      manager.subscribe('ogcServers', callback);
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
      const theme = new ThemeLayer(1, 'test', 0, 'iconpath');
      theme.children.push(new LayerOsm(0));
      manager.state.themes._allThemes[theme.id] = theme;
      manager.subscribe(/.*/, callback);
      controlValue = 1;
      manager.state.themes._allThemes[theme.id].children[0].name = 'new name';
      expect(controlValue).toEqual(1);
      manager.state.themes._allThemes[theme.id].name = 'new name';
      expect(controlValue).toEqual(1);
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
