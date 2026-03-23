// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach } from 'vitest';
import Brain from './brain';
import areEqual from './equality';

type TestState = {
  intValue?: number | null;
  stringValue?: string | null;
  bigintValue?: bigint | null;
  booleanValue?: boolean | null;
};
let state: TestState;

let controlValue: number;
let brain: Brain<TestState>;

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
  if (typeof expectedOldValue !== 'number' || !isNaN(expectedOldValue)) {
    expect(areEqual(oldValue, expectedOldValue)).toBeTruthy();
  }
  if (typeof expectedNewValue !== 'number' || !isNaN(expectedNewValue)) {
    expect(areEqual(newValue, expectedNewValue)).toBeTruthy();
  }
  expect(parents[0].__brainIsProxy).toBeTruthy();
}

describe('State: Monitor numbers', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor numbers: undefined to int', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'intValue', oldValue, undefined, newValue, 1, parents)
    );
    brain.getState().intValue = 1;
    expect(controlValue).toBe(2);
  });
  it('Monitor numbers: int to int', () => {
    state.intValue = 123;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'intValue', oldValue, 123, newValue, 456, parents)
    );
    brain.getState().intValue = 456;
    expect(controlValue).toBe(2);
  });
  it('Monitor numbers: no change for int', () => {
    state.intValue = 123;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().intValue = 123;
    expect(controlValue).toBe(1);
  });
  it('Monitor numbers: no change for undefined', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 123, newValue, 456, parents)
    );
    brain.getState().intValue = undefined;
    expect(controlValue).toBe(1);
  });
  it('Monitor numbers: no change for null', () => {
    state.intValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 123, newValue, 456, parents)
    );
    brain.getState().intValue = null;
    expect(controlValue).toBe(1);
  });
  it('Monitor numbers: undefined to null', () => {
    state.intValue = undefined;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'intValue', oldValue, undefined, newValue, null, parents)
    );
    brain.getState().intValue = null;
    expect(controlValue).toBe(2);
  });
  it('Monitor numbers: null to undefined', () => {
    state.intValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'intValue', oldValue, null, newValue, undefined, parents)
    );
    brain.getState().intValue = undefined;
    expect(controlValue).toBe(2);
  });
  it('Monitor numbers: NaN', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'intValue', oldValue, undefined, newValue, NaN, parents)
    );
    brain.getState().intValue = NaN;
    expect(controlValue).toBe(2);
  });
});

describe('State: Monitor strings', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor strings: undefined to string', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'stringValue', oldValue, undefined, newValue, 's1', parents)
    );
    brain.getState().stringValue = 's1';
    expect(controlValue).toBe(2);
  });
  it('Monitor strings: string to string', () => {
    state.stringValue = 's1';
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'stringValue', oldValue, 's1', newValue, 's2', parents)
    );
    brain.getState().stringValue = 's2';
    expect(controlValue).toBe(2);
  });
  it('Monitor strings: no change for string', () => {
    state.stringValue = 's1';
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().stringValue = 's1';
    expect(controlValue).toBe(1);
  });
  it('Monitor strings: no change for undefined', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().stringValue = undefined;
    expect(controlValue).toBe(1);
  });
  it('Monitor strings: no change for null', () => {
    state.stringValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().stringValue = null;
    expect(controlValue).toBe(1);
  });
  it('Monitor strings: undefined to null', () => {
    state.stringValue = undefined;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'stringValue', oldValue, undefined, newValue, null, parents)
    );
    brain.getState().stringValue = null;
    expect(controlValue).toBe(2);
  });
  it('Monitor strings: null to undefined', () => {
    state.stringValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'stringValue', oldValue, null, newValue, undefined, parents)
    );
    brain.getState().stringValue = undefined;
    expect(controlValue).toBe(2);
  });
});

describe('State: Monitor bigints', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor bigints: undefined to bigint', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'bigintValue', oldValue, undefined, newValue, 321654987n, parents)
    );
    brain.getState().bigintValue = 321654987n;
    expect(controlValue).toBe(2);
  });
  it('Monitor bigints: bigint to bigint', () => {
    state.bigintValue = 321654987n;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'bigintValue', oldValue, 321654987n, newValue, 147852369n, parents)
    );
    brain.getState().bigintValue = 147852369n;
    expect(controlValue).toBe(2);
  });
  it('Monitor bigints: no change for bigint', () => {
    state.bigintValue = 321654987n;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().bigintValue = 321654987n;
    expect(controlValue).toBe(1);
  });
  it('Monitor bigints: no change for undefined', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().bigintValue = undefined;
    expect(controlValue).toBe(1);
  });
  it('Monitor bigints: no change for null', () => {
    state.bigintValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().bigintValue = null;
    expect(controlValue).toBe(1);
  });
  it('Monitor bigints: undefined to null', () => {
    state.bigintValue = undefined;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'bigintValue', oldValue, undefined, newValue, null, parents)
    );
    brain.getState().bigintValue = null;
    expect(controlValue).toBe(2);
  });
  it('Monitor bigints: null to undefined', () => {
    state.bigintValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'bigintValue', oldValue, null, newValue, undefined, parents)
    );
    brain.getState().bigintValue = undefined;
    expect(controlValue).toBe(2);
  });
});

describe('State: Monitor booleans', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor booleans: undefined to boolean', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'booleanValue', oldValue, undefined, newValue, true, parents)
    );
    brain.getState().booleanValue = true;
    expect(controlValue).toBe(2);
  });
  it('Monitor booleans: boolean to boolean', () => {
    state.booleanValue = false;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'booleanValue', oldValue, false, newValue, true, parents)
    );
    brain.getState().booleanValue = true;
    expect(controlValue).toBe(2);
  });
  it('Monitor booleans: no change for boolean', () => {
    state.booleanValue = true;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().booleanValue = true;
    expect(controlValue).toBe(1);
  });
  it('Monitor booleans: no change for undefined', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().booleanValue = undefined;
    expect(controlValue).toBe(1);
  });
  it('Monitor booleans: no change for null', () => {
    state.booleanValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().booleanValue = null;
    expect(controlValue).toBe(1);
  });
  it('Monitor booleans: undefined to null', () => {
    state.booleanValue = undefined;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'booleanValue', oldValue, undefined, newValue, null, parents)
    );
    brain.getState().booleanValue = null;
    expect(controlValue).toBe(2);
  });
  it('Monitor booleans: null to undefined', () => {
    state.booleanValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForPrimitives(property, 'booleanValue', oldValue, null, newValue, undefined, parents)
    );
    brain.getState().booleanValue = undefined;
    expect(controlValue).toBe(2);
  });
});
