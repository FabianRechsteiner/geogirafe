// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach } from 'vitest';
import Brain from './brain';
import areEqual from './equality';

type TestState = {
  arrayValue?: unknown[] | null;
  anotherArrayValue?: [] | null;
};
let state: TestState;

let controlValue: number;
let brain: Brain<TestState>;

function onChangeForArray(
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

describe('State: Monitor arrays', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor arrays: undefined to array', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, undefined, newValue, ['value'], parents)
    );
    brain.getState().arrayValue = ['value'];
    expect(controlValue).toBe(2);
  });
  it('Monitor arrays: empty array to array', () => {
    state.arrayValue = [];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [], newValue, ['value'], parents)
    );
    brain.getState().arrayValue = ['value'];
    expect(controlValue).toBe(2);
  });
  it('Monitor arrays: array to array', () => {
    state.arrayValue = ['value', 1, null, undefined, 321654987n, true, false];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(
        property,
        'arrayValue',
        oldValue,
        ['value', 1, null, undefined, 321654987n, true, false],
        newValue,
        ['value', 1, null, undefined, 32165498n, true, false],
        parents
      )
    );
    brain.getState().arrayValue = ['value', 1, null, undefined, 32165498n, true, false];
    expect(controlValue).toBe(2);
  });
  it('Monitor arrays: no change for array', () => {
    state.arrayValue = ['value', 1, null, undefined, 321654987n, true, false];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().arrayValue = ['value', 1, null, undefined, 321654987n, true, false];
    expect(controlValue).toBe(1);
  });
  it('Monitor arrays: no change for undefined', () => {
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().arrayValue = undefined;
    expect(controlValue).toBe(1);
  });
  it('Monitor arrays: no change for null', () => {
    state.arrayValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );
    brain.getState().arrayValue = null;
    expect(controlValue).toBe(1);
  });
  it('Monitor arrays: undefined to null', () => {
    state.arrayValue = undefined;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, undefined, newValue, null, parents)
    );
    brain.getState().arrayValue = null;
    expect(controlValue).toBe(2);
  });
  it('Monitor arrays: null to undefined', () => {
    state.arrayValue = null;
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, null, newValue, undefined, parents)
    );
    brain.getState().arrayValue = undefined;
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays: set same item by index', () => {
    state.arrayValue = ['value', 'anotherValue'];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    brain.getState().arrayValue![1] = 'anotherValue';
    expect(controlValue).toBe(1);
  });

  it('Monitor arrays: set different item by index', () => {
    state.arrayValue = ['value', 'anotherValue'];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(
        property,
        'arrayValue',
        oldValue,
        ['value', 'anotherValue'],
        newValue,
        ['value', 'newValue'],
        parents
      )
    );

    brain.getState().arrayValue![1] = 'newValue';
    expect(controlValue).toBe(2);
  });
});

describe('State: Monitor array functions', () => {
  beforeEach(() => {
    // Reset control value and state
    controlValue = 1;
    state = {};
  });

  it('Monitor arrays functions: array length', () => {
    state.arrayValue = ['value', 1, null, undefined, 321654987n, true, false];
    brain = new Brain(state, () => {});

    const length = brain.getState().arrayValue!.length;
    expect(length).toBe(7);
  });

  it('Monitor arrays functions: should return keys of a proxied array', () => {
    state.arrayValue = ['value', 1, null, undefined, 321654987n, true, false];
    brain = new Brain(state, () => {});

    const keys = Object.keys(brain.getState().arrayValue!);
    expect(keys.length).toBe(7);
  });

  it('Monitor arrays functions: should return empty array on empty object', () => {
    state.arrayValue = [];
    brain = new Brain(state, () => {});

    const keys = Object.keys(brain.getState().arrayValue!);
    expect(keys).toEqual([]);
  });

  it('Monitor arrays functions: should return values of a proxied array (primitives)', () => {
    state.arrayValue = ['value', 1, null, undefined, 321654987n, true, false];
    brain = new Brain(state, () => {});

    const values = Object.values(brain.getState().arrayValue!);
    expect(values.length).toBe(7);
    expect(values).toContain('value');
    expect(values).toContain(1);
    expect(values).toContain(null);
    expect(values).toContain(undefined);
    expect(values).toContain(321654987n);
    expect(values).toContain(true);
    expect(values).toContain(false);
  });

  it('Monitor arrays functions: should return values of a proxied object (proxies)', () => {
    state.arrayValue = [{ key: 'pizza1' }, { key: 'pizza2' }];
    brain = new Brain(state, () => {});

    const values: any[] = Object.values(brain.getState().arrayValue!);
    expect(values.length).toBe(2);
    expect(values[0].__brainIsProxy).toBeTruthy();
    expect(values[1].__brainIsProxy).toBeTruthy();
  });

  it('Monitor arrays functions: push', () => {
    state.arrayValue = ['value'];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, ['value'], newValue, ['value', 'anotherValue'], parents)
    );

    brain.getState().arrayValue!.push('anotherValue');
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: push proxy', () => {
    const pizza = { key: 'pizza' };
    state.arrayValue = [pizza];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [pizza], newValue, [pizza, pizza], parents)
    );

    brain.getState().arrayValue!.push(brain.getState().arrayValue![0]);
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: pop', () => {
    state.arrayValue = [1, 2, 3, 4, 5];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [1, 2, 3, 4, 5], newValue, [1, 2, 3, 4], parents)
    );

    brain.getState().arrayValue!.pop();
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: splice (add)', () => {
    state.arrayValue = [1, 4, 5];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [1, 4, 5], newValue, [1, 2, 4, 5], parents)
    );

    brain.getState().arrayValue!.splice(1, 0, 2);
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: splice (remove)', () => {
    state.arrayValue = [1, 2, 3, 4, 5];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [1, 2, 3, 4, 5], newValue, [1, 2, 4, 5], parents)
    );

    brain.getState().arrayValue!.splice(2, 1);
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: splice (remove with proxied objects)', () => {
    const o0 = { id: 0 };
    const o1 = { id: 1 };
    const o2 = { id: 2 };
    state.arrayValue = [o0, o1, o2];
    brain = new Brain(state, () => {});

    const po0 = brain.getState().arrayValue![0] as any;
    const po1 = brain.getState().arrayValue![1] as any;
    const po2 = brain.getState().arrayValue![2] as any;

    expect(po0.__brainTarget).toBe(o0);
    expect(po1.__brainTarget).toBe(o1);
    expect(po2.__brainTarget).toBe(o2);

    const brainChildren = brain.getState().arrayValue!.__brainChildren;
    expect(brainChildren.size).toBe(3);
    expect(brainChildren.get('0')).toBe(po0);
    expect(brainChildren.get('1')).toBe(po1);
    expect(brainChildren.get('2')).toBe(po2);

    expect(brainChildren.get('0')!.__brainFullPaths.length).toBe(1);
    expect(brainChildren.get('1')!.__brainFullPaths.length).toBe(1);
    expect(brainChildren.get('2')!.__brainFullPaths.length).toBe(1);

    expect(brainChildren.get('0')!.__brainFullPaths[0]).toBe('arrayValue.0');
    expect(brainChildren.get('1')!.__brainFullPaths[0]).toBe('arrayValue.1');
    expect(brainChildren.get('2')!.__brainFullPaths[0]).toBe('arrayValue.2');

    brain.getState().arrayValue!.splice(0, 1);
    expect(brain.getState().arrayValue?.length).toBe(2);
    expect(brainChildren.size).toBe(2);
    expect(brainChildren.get('0')).toBe(po1);
    expect(brainChildren.get('1')).toBe(po2);

    expect(brainChildren.get('0')!.__brainFullPaths.length).toBe(1);
    expect(brainChildren.get('1')!.__brainFullPaths.length).toBe(1);

    expect(brainChildren.get('0')!.__brainFullPaths[0]).toBe('arrayValue.0');
    expect(brainChildren.get('1')!.__brainFullPaths[0]).toBe('arrayValue.1');
  });

  it('Monitor arrays functions: splice (updates children paths when array indices shift)', () => {
    const o0 = { id: 0 };
    const o1 = { id: 1 };
    const o2 = { id: 2 };
    state.arrayValue = [o0, o1, o2];

    brain = new Brain(state, () => {});
    const proxyState = brain.getState();

    const po0 = proxyState.arrayValue![0] as any;
    const po2 = proxyState.arrayValue![2] as any;

    // Remove index 1 (o1)
    proxyState.arrayValue!.splice(1, 1);

    const brainChildren = proxyState.arrayValue!.__brainChildren;
    expect(brainChildren.size).toBe(2);

    // o0 stays at index 0
    expect(brainChildren.get('0')).toBe(po0);
    expect(po0.__brainFullPaths).toEqual(['arrayValue.0']);

    // o2 shifts from index 2 to index 1
    expect(brainChildren.get('1')).toBe(po2);
    expect(po2.__brainFullPaths).toEqual(['arrayValue.1']);
  });

  it('Monitor arrays functions: unshift', () => {
    state.arrayValue = [1, 2, 3, 4, 5];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [1, 2, 3, 4, 5], newValue, [0, 1, 2, 3, 4, 5], parents)
    );

    brain.getState().arrayValue!.unshift(0);
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: unshift (propagates path updates to deep nested children)', () => {
    const nested = { inner: { id: 123 } };
    state.arrayValue = [nested];

    brain = new Brain(state, () => {});
    const proxyState = brain.getState();

    const pNested = proxyState.arrayValue![0] as any;
    const pInner = pNested.inner as any;

    expect(pInner.__brainFullPaths).toEqual(['arrayValue.0.inner']);

    // Insert a new element at the beginning
    proxyState.arrayValue!.unshift({ dummy: true });

    // The deep child should now have updated paths
    expect(pInner.__brainFullPaths).toEqual(['arrayValue.1.inner']);
  });

  it('Monitor arrays functions: shift', () => {
    state.arrayValue = [1, 2, 3, 4, 5];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [1, 2, 3, 4, 5], newValue, [2, 3, 4, 5], parents)
    );

    brain.getState().arrayValue!.shift();
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: filter (not called)', () => {
    state.arrayValue = [1, 2, 3, 4, 5];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    brain.getState().arrayValue!.filter((item) => item !== 3);
    expect(controlValue).toBe(1);
  });

  it('Monitor arrays functions: filter', () => {
    state.arrayValue = [1, 2, 3, 4, 5];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [1, 2, 3, 4, 5], newValue, [1, 2, 4, 5], parents)
    );

    const filteredArray = brain.getState().arrayValue!.filter((item) => item !== 3);
    brain.getState().arrayValue = filteredArray;
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: filter proxy', () => {
    state.arrayValue = [{ key: 'pizza1' }, { key: 'pizza2' }, { key: 'pizza3' }];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    const filteredArray = brain.getState().arrayValue!.filter((item: any) => item.key !== 'pizza2') as object[];
    expect(controlValue).toBe(1);
    expect(filteredArray.length).toBe(2);
    expect(filteredArray[0].__brainIsProxy).toBeTruthy();
    expect(filteredArray[1].__brainIsProxy).toBeTruthy();
  });

  it('Monitor arrays functions: filter test proxy in callback', () => {
    state.arrayValue = [1, null, { key: 'pizza1' }, 'string', { key: 'pizza2' }];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    const filteredArray = brain.getState().arrayValue!.filter((item: any) => item?.__brainIsProxy) as object[];
    expect(controlValue).toBe(1);
    expect(filteredArray.length).toBe(2);
    expect(filteredArray[0].__brainIsProxy).toBeTruthy();
    expect(filteredArray[1].__brainIsProxy).toBeTruthy();
    expect(areEqual(filteredArray[0], { key: 'pizza1' })).toBeTruthy();
    expect(areEqual(filteredArray[1], { key: 'pizza2' })).toBeTruthy();
  });

  it('Monitor arrays functions: concat', () => {
    state.arrayValue = [1, 2, 3];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [1, 2, 3], newValue, [1, 2, 3, 4, 5], parents)
    );

    brain.getState().arrayValue = brain.getState().arrayValue?.concat([4, 5]);
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: ...spread', () => {
    state.arrayValue = [1, 2, 3];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [1, 2, 3], newValue, [1, 2, 3, 4], parents)
    );

    brain.getState().arrayValue = [...brain.getState().arrayValue!, 4];
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: find primitive', () => {
    state.arrayValue = [1, 2, 3];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    const result = (brain.getState().arrayValue! as number[]).find((item) => item >= 2);
    expect(result).toBe(2);
  });

  it('Monitor arrays functions: find proxy', () => {
    state.arrayValue = [{ key: 'pizza1' }, { key: 'pizza2' }, { key: 'pizza3' }];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    const result = brain.getState().arrayValue!.find((item: any) => item.key == 'pizza2') as any;
    expect(result.__brainIsProxy).toBeTruthy();
  });

  it('Monitor arrays functions: sort', () => {
    state.arrayValue = [5, 2, 1, 4, 3];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'arrayValue', oldValue, [5, 2, 1, 4, 3], newValue, [1, 2, 3, 4, 5], parents)
    );

    brain.getState().arrayValue!.sort();
    expect(controlValue).toBe(2);
  });

  it('Monitor arrays functions: for in', () => {
    state.arrayValue = [{ key: 'pizza1' }, { key: 'pizza2' }, { key: 'pizza3' }];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    for (const index in brain.getState().arrayValue) {
      const pizza = brain.getState().arrayValue![Number(index)];
      expect((pizza as any).__brainIsProxy).toBeTruthy();
    }
    expect(controlValue).toBe(1);
  });

  it('Monitor arrays functions: for of', () => {
    state.arrayValue = [{ key: 'pizza1' }, { key: 'pizza2' }, { key: 'pizza3' }];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    for (const pizza of brain.getState().arrayValue!) {
      expect((pizza as any).__brainIsProxy).toBeTruthy();
    }
    expect(controlValue).toBe(1);
  });

  it('Monitor arrays functions: for of proxy modify', () => {
    const pizza1 = { key: { t: 'pizza1' } };
    const pizza2 = { key: { t: 'pizza2' } };
    const pizza3 = { key: { t: 'pizza3' } };
    state.arrayValue = [pizza1, pizza2, pizza3];
    brain = new Brain(state, (property, oldValue, newValue, parents) => {
      const expectedProperty = `arrayValue.${controlValue - 1}.key`;
      const expectedNewValue = { t: 'pizzaSpecial' };
      const expectedOldValue =
        controlValue === 1 ? { t: 'pizza1' } : controlValue === 2 ? { t: 'pizza2' } : { t: 'pizza3' };
      onChangeForArray(property, expectedProperty, oldValue, expectedOldValue, newValue, expectedNewValue, parents);
    });

    let count = controlValue;
    for (const pizza of brain.getState().arrayValue!) {
      count++;
      (pizza as any).key = { t: 'pizzaSpecial' };
      expect(controlValue).toBe(count);
    }
  });

  it('Monitor arrays functions: foreach', () => {
    state.arrayValue = [{ key: 'pizza1' }, { key: 'pizza2' }, { key: 'pizza3' }];
    brain = new Brain(state, (property, oldValue, newValue, parents) =>
      onChangeForArray(property, 'SHOULD NOT BE CALLED', oldValue, 0, newValue, 0, parents)
    );

    brain.getState().arrayValue!.forEach((pizza) => {
      expect((pizza as any).__brainIsProxy).toBeTruthy();
    });
    expect(controlValue).toBe(1);
  });

  it('Monitor arrays: constructor', () => {
    state.arrayValue = [{ key: 'pizza1' }, { key: 'pizza2' }, { key: 'pizza3' }];
    brain = new Brain(state, () => {});

    const length = brain.getState().arrayValue!.length;
    const array = brain.getState().arrayValue!;
    // @ts-expect-error
    const newArray = new array.constructor(length);
  });

  // TODO Test the following functions :
  // - map(callback)	Transforme chaque élément.
  // - reduce(callback, initialValue)	Réduit à une seule valeur.
  // - reduceRight(callback, initialValue)	Pareil, mais de droite à gauche.
  // - some(callback)	Retourne true si au moins un passe le test.
  // - every(callback)	Retourne true si tous passent.
  // - flat(depth?)	Aplati un tableau de tableaux.
  // - flatMap(callback)
});
