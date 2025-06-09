import { describe, it, expect, beforeEach } from 'vitest';
import Brain from './brain';
import areEqual from './equality';

type TestState = {
  dateValue?: Date | null;
};
let state: TestState;

let controlValue: number;
let brain: Brain<TestState>;

function onChangeForDate(
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
  expect(areEqual(newValue?.__brainTarget ?? newValue, expectedNewValue)).toBeTruthy();
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

describe('State: Monitor dates', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor dates: undefined to date', () => {
    const date = new Date(2022, 22, 2);
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'dateValue', oldValue, undefined, newValue, date, parents)
    );
    brain.getState().dateValue = date;
    expect(controlValue).toBe(2);
  });

  it('Monitor dates: date to date', () => {
    const date = new Date(2009, 5, 26);
    const newDate = new Date(2011, 5, 1);
    state.dateValue = date;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'dateValue', oldValue, date, newValue, newDate, parents)
    );
    brain.getState().dateValue = newDate;
    expect(controlValue).toBe(2);
  });
  it('Monitor dates: no change for date (same object)', () => {
    const date = new Date(2009, 5, 26);
    state.dateValue = date;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'SHOULD NOT BE CALLED', oldValue, null, newValue, null, parents)
    );
    brain.getState().dateValue = date;
    expect(controlValue).toBe(1);
  });
  it('Monitor dates: no change for date (different objects)', () => {
    const date = new Date(2009, 5, 26);
    const newDate = new Date(2009, 5, 26);
    state.dateValue = date;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'SHOULD NOT BE CALLED', oldValue, null, newValue, null, parents)
    );
    brain.getState().dateValue = newDate;
    expect(controlValue).toBe(1);
  });
  it('Monitor dates: no change for undefined', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'SHOULD NOT BE CALLED', oldValue, null, newValue, null, parents)
    );
    brain.getState().dateValue = undefined;
    expect(controlValue).toBe(1);
  });
  it('Monitor dates: no change for null', () => {
    state.dateValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'SHOULD NOT BE CALLED', oldValue, null, newValue, null, parents)
    );
    brain.getState().dateValue = null;
    expect(controlValue).toBe(1);
  });
  it('Monitor dates: undefined to null', () => {
    state.dateValue = undefined;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'dateValue', oldValue, undefined, newValue, null, parents)
    );
    brain.getState().dateValue = null;
    expect(controlValue).toBe(2);
  });
  it('Monitor dates: null to undefined', () => {
    state.dateValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'dateValue', oldValue, null, newValue, undefined, parents)
    );
    brain.getState().dateValue = undefined;
    expect(controlValue).toBe(2);
  });
  it('Monitor dates: set methods', () => {
    const date = new Date(2009, 5, 26); // Will be modified
    const oldDate = new Date(date);
    const newDate = new Date(2011, 5, 26); // Should be equal after modification
    state.dateValue = date;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForDate(property, 'dateValue', oldValue, oldDate, newValue, newDate, parents)
    );
    brain.getState().dateValue!.setFullYear(2011);
    expect(controlValue).toBe(2);

    oldDate.setFullYear(2011);
    newDate.setMinutes(12, 58);
    brain.getState().dateValue!.setMinutes(12, 58);
    expect(controlValue).toBe(3);

    // Should not be updated, seconds are the same
    brain.getState().dateValue!.setSeconds(58);
    expect(controlValue).toBe(3);
  });
});
