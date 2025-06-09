import { describe, it, expect, beforeEach } from 'vitest';
import Brain from './brain';
import areEqual from './equality';

type TestState = {
  objectValue?: {} | null;
  anotherValue?: {} | null;
};
let state: TestState;

let controlValue: number;
let brain: Brain<TestState>;

function onChangeForObject(
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
  if (newValue) {
    expect(newValue.__brainIsProxy).toBeTruthy();
  }
  if (parents.length > 0) {
    expect(parents[0].__brainIsProxy).toBeTruthy();
    if (newValue?.__brainIsProxy) {
      expect(Array.from(parents[0].__brainChildren.values()).includes(newValue)).toBeTruthy();
    }
  }
}

describe('State: Monitor objects', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor objects: undefined to object', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'objectValue', oldValue, undefined, newValue, { key: 'value' }, parents)
    );
    brain.getState().objectValue = { key: 'value' };
    expect(controlValue).toBe(2);
  });
  it('Monitor objects: empty object to object', () => {
    state.objectValue = {};
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'objectValue', oldValue, {}, newValue, { key: 'value' }, parents)
    );
    brain.getState().objectValue = { key: 'value' };
    expect(controlValue).toBe(2);
  });
  it('Monitor objects: object to object', () => {
    state.objectValue = { key: 'value' };
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'objectValue', oldValue, { key: 'value' }, newValue, { key: 'anothervalue' }, parents)
    );
    brain.getState().objectValue = { key: 'anothervalue' };
    expect(controlValue).toBe(2);
  });
  it('Monitor objects: no change for object', () => {
    state.objectValue = { key: 'value' };
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().objectValue = { key: 'value' };
    expect(controlValue).toBe(1);
  });
  it('Monitor objects: no change for undefined', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().objectValue = undefined;
    expect(controlValue).toBe(1);
  });
  it('Monitor objects: no change for null', () => {
    state.objectValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().objectValue = null;
    expect(controlValue).toBe(1);
  });
  it('Monitor objects: undefined to null', () => {
    state.objectValue = undefined;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'objectValue', oldValue, undefined, newValue, null, parents)
    );
    brain.getState().objectValue = null;
    expect(controlValue).toBe(2);
  });
  it('Monitor objects: null to undefined', () => {
    state.objectValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'objectValue', oldValue, null, newValue, undefined, parents)
    );
    brain.getState().objectValue = undefined;
    expect(controlValue).toBe(2);
  });
});

describe('State: Monitor object functions', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor objects functions: should return keys of a proxied object', () => {
    state.objectValue = { a: 1, b: 2 };
    brain = new Brain(state, () => {});

    const keys = Object.keys(brain.getState().objectValue!);
    expect(keys.length).toBe(2);
    expect(keys).toContain('a');
    expect(keys).toContain('b');
  });

  it('Monitor objects functions: should return empty array on empty object (keys)', () => {
    state.objectValue = {};
    brain = new Brain(state, () => {});

    const keys = Object.keys(brain.getState().objectValue!);
    expect(keys).toEqual([]);
  });

  it('Monitor objects functions: should return empty array on empty object (values)', () => {
    state.objectValue = {};
    brain = new Brain(state, () => {});

    const values = Object.values(brain.getState().objectValue!);
    expect(values).toEqual([]);
  });

  it('Monitor objects functions: should return values of a proxied object (primitives)', () => {
    state.objectValue = { a: 1, b: 2 };
    brain = new Brain(state, () => {});

    const values = Object.values(brain.getState().objectValue!);
    expect(values.length).toBe(2);
    expect(values).toContain(1);
    expect(values).toContain(2);
  });

  it('Monitor objects functions: should return values of a proxied object (proxies)', () => {
    state.objectValue = { a: { key: 'pizza1' }, b: { key: 'pizza2' } };
    brain = new Brain(state, () => {});

    const values: any[] = Object.values(brain.getState().objectValue!);
    expect(values.length).toBe(2);
    expect(values[0].__brainIsProxy).toBeTruthy();
    expect(values[1].__brainIsProxy).toBeTruthy();
  });

  it('Monitor objects functions: should callback when modifying value from Object.values', () => {
    state.objectValue = { a: { key: { t: 'pizza1' } }, b: { key: { t: 'pizza2' } } };
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'objectValue.a.key', oldValue, { t: 'pizza1' }, newValue, { t: 'pizza3' }, parents)
    );

    const values: any[] = Object.values(brain.getState().objectValue!);
    values[0].key = { t: 'pizza3' };
    expect(controlValue).toBe(2);
  });

  it('Monitor objects functions: should return empty array on empty object with Object.entries', () => {
    state.objectValue = {};
    brain = new Brain(state, () => {});

    const entries = Object.entries(brain.getState().objectValue!);
    expect(entries).toEqual([]);
  });

  it('Monitor objects functions: should return entries of a proxied object (primitives)', () => {
    state.objectValue = { a: 1, b: 2 };
    brain = new Brain(state, () => {});

    const entries = Object.entries(brain.getState().objectValue!);
    expect(entries.length).toBe(2);
    expect(entries).toContainEqual(['a', 1]);
    expect(entries).toContainEqual(['b', 2]);
  });

  it('Monitor objects functions: should return entries of a proxied object (proxies)', () => {
    state.objectValue = { a: { key: 'pizza1' }, b: { key: 'pizza2' } };
    brain = new Brain(state, () => {});

    const entries: [string, any][] = Object.entries(brain.getState().objectValue!);
    expect(entries.length).toBe(2);
    expect(entries[0][1].__brainIsProxy).toBeTruthy();
    expect(entries[1][1].__brainIsProxy).toBeTruthy();
  });

  it('Monitor objects functions: should callback when modifying value from Object.entries', () => {
    state.objectValue = { a: { key: { t: 'pizza1' } }, b: { key: { t: 'pizza2' } } };
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForObject(property, 'objectValue.a.key', oldValue, { t: 'pizza1' }, newValue, { t: 'pizza3' }, parents)
    );

    const entries: [string, any][] = Object.entries(brain.getState().objectValue!);
    entries[0][1].key = { t: 'pizza3' };
    expect(controlValue).toBe(2);
  });
});
