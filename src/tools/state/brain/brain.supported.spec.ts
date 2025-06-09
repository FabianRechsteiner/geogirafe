import { describe, it, expect, beforeEach } from 'vitest';
import Brain from './brain';

type TestState = {
  weakMap?: WeakMap<any, any>;
  weakSet?: WeakSet<any>;
};
let state: TestState;
let brain: Brain<TestState>;

describe('State: Monitor supported', () => {
  beforeEach(() => {
    // Reset state
    state = {};
  });

  it('Monitor supported: do not support WeakMap (set)', () => {
    brain = new Brain(state, () => {});
    expect(() => {
      brain.getState().weakMap = new WeakMap<any, any>();
    }).toThrowError();
  });

  it('Monitor supported: do not support WeakMap (get)', () => {
    state = {
      weakMap: new WeakMap<any, any>()
    };
    brain = new Brain(state, () => {});
    expect(() => {
      brain.getState().weakMap?.get('toto');
    }).toThrowError();
  });

  it('Monitor supported: do not support WeakSet (set)', () => {
    brain = new Brain(state, () => {});
    expect(() => {
      brain.getState().weakSet = new WeakSet<any>();
    }).toThrowError();
  });

  it('Monitor supported: do not support WeakSet (get)', () => {
    state = {
      weakSet: new WeakSet<any>()
    };
    brain = new Brain(state, () => {});
    expect(() => {
      brain.getState().weakSet?.has('toto');
    }).toThrowError();
  });
});
