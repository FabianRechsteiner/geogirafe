import { describe, it, expect, beforeEach } from 'vitest';
import Brain from './brain';
import areEqual from './equality';

type TestState = {
  _ignoredValue?: string;
  [ignoredSymbolKey: symbol]: string;
};
let state: TestState;

let controlValue: number;
let brain: Brain<TestState>;
const ignoredSymbol = Symbol('myIgnoredSymbol');

function onChangeForPrimitives(
  property: string,
  expectedProperty: string,
  oldValue: unknown,
  expectedOldValue: unknown,
  newValue: unknown,
  expectedNewValue: unknown,
  parents: any[]
) {
  controlValue++;
  expect(property).toBe(expectedProperty);
  expect(areEqual(oldValue, expectedOldValue)).toBeTruthy();
  expect(areEqual(newValue, expectedNewValue)).toBeTruthy();
  expect(parents[0].__brainIsProxy).toBeTruthy();
}

describe('State: Monitor ignored', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {
      [ignoredSymbol]: 'testIgnoreSymbol'
    };
  });

  it('Monitor ignored: ignore if prefixed with underscore', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState()._ignoredValue = 'SHOULD NOT BE CALLED';
    expect(controlValue).toBe(1);
  });

  it('Monitor ignored: ignore if prefixed with underscore (different values)', () => {
    const localState = {
      val: 'test',
      obj: {
        key: 'mykey',
        _ignored: 'val1'
      }
    };
    brain = new Brain(localState, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    (brain.getState() as any).obj = { key: 'mykey', _ignored: 'val2' };
    expect(controlValue).toBe(1);
  });

  it('Monitor ignored: ignore symbols', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState()[ignoredSymbol] = 'SHOULD NOT BE CALLED';
    expect(controlValue).toBe(1);
  });
});
