import { describe, it, expect, beforeEach } from 'vitest';
import Brain from './brain';
import { BrainIgnoreClone } from './decorators';

type TestState = {
  objectValue: {};
  otherObjectValue: {};
};
let state: TestState;
let brain: Brain<TestState>;

describe('State: base principles', () => {
  beforeEach(() => {
    state = {
      objectValue: {},
      otherObjectValue: {}
    };
  });

  it('Base principles: check virtual properties on root state', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });
    expect(state.__brainIsProxy).toBeFalsy();
    expect(brain.getState().__brainIsProxy).toBeTruthy();
    expect(brain.getState().__brainTarget).toBe(state);
    expect(brain.getState().__brainChildren).toBeInstanceOf(Map);
    expect(brain.getState().__brainChildren.size).toBe(0);
    expect(brain.getState().__brainParents).toBeUndefined();
    expect(brain.getState().__brainFullPaths).toBeInstanceOf(Array);
    expect(brain.getState().__brainFullPaths.length).toBe(1);
    expect(brain.getState().__brainFullPaths[0]).toBe('');
  });

  it('Base principles: check virtual properties on child', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });
    const pizza = { key: 'pizza' };
    brain.getState().objectValue = pizza;

    expect(pizza.__brainIsProxy).toBeFalsy();
    expect(brain.getState().objectValue.__brainIsProxy).toBeTruthy();
    expect(brain.getState().objectValue.__brainTarget).toBe(pizza);
    expect(brain.getState().objectValue.__brainChildren).toBeInstanceOf(Map);
    expect(brain.getState().objectValue.__brainChildren.size).toBe(0);
    expect(brain.getState().objectValue.__brainParents).toBeInstanceOf(Array);
    expect(brain.getState().objectValue.__brainParents[0]).toBe(brain.getState());
    expect(brain.getState().objectValue.__brainChildren.size).toBe(0);
    expect(brain.getState().objectValue.__brainFullPaths).toBeInstanceOf(Array);
    expect(brain.getState().objectValue.__brainFullPaths.length).toBe(1);
    expect(brain.getState().objectValue.__brainFullPaths[0]).toBe('objectValue');
    expect(brain.getState().__brainChildren.size).toBe(1);
    expect(brain.getState().__brainChildren.get('objectValue')).toBe(brain.getState().objectValue);
  });

  it('Base principles: should create different proxies for different objects', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });
    const pizza1 = { key: 'pizza1' };
    const pizza2 = { key: 'pizza2' };
    brain.getState().objectValue = pizza1;
    brain.getState().otherObjectValue = pizza2;

    expect(brain.getState().__brainChildren.size).toBe(2);
    expect(brain.getState().__brainChildren.get('objectValue')).toBe(brain.getState().objectValue);
    expect(brain.getState().__brainChildren.get('otherObjectValue')).toBe(brain.getState().otherObjectValue);

    expect(pizza1.__brainIsProxy).toBeFalsy();
    expect(brain.getState().objectValue.__brainIsProxy).toBeTruthy();
    expect(brain.getState().objectValue.__brainTarget).toBe(pizza1);
    expect(brain.getState().objectValue.__brainChildren.size).toBe(0);
    expect(brain.getState().objectValue.__brainParents[0]).toBe(brain.getState());
    expect(brain.getState().objectValue.__brainFullPaths).toBeInstanceOf(Array);
    expect(brain.getState().objectValue.__brainFullPaths.length).toBe(1);
    expect(brain.getState().objectValue.__brainFullPaths[0]).toBe('objectValue');

    expect(pizza2.__brainIsProxy).toBeFalsy();
    expect(brain.getState().otherObjectValue.__brainIsProxy).toBeTruthy();
    expect(brain.getState().otherObjectValue.__brainTarget).toBe(pizza2);
    expect(brain.getState().otherObjectValue.__brainChildren.size).toBe(0);
    expect(brain.getState().otherObjectValue.__brainParents[0]).toBe(brain.getState());
    expect(brain.getState().otherObjectValue.__brainFullPaths).toBeInstanceOf(Array);
    expect(brain.getState().otherObjectValue.__brainFullPaths.length).toBe(1);
    expect(brain.getState().otherObjectValue.__brainFullPaths[0]).toBe('otherObjectValue');
  });

  it('Base principles: should create different proxies for different objects with same values', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });
    const pizza1 = { key: 'pizza1' };
    const pizza2 = { key: 'pizza1' };
    brain.getState().objectValue = pizza1;
    brain.getState().otherObjectValue = pizza2;

    expect(brain.getState().__brainChildren.size).toBe(2);
    expect(brain.getState().__brainChildren.get('objectValue')).toBe(brain.getState().objectValue);
    expect(brain.getState().__brainChildren.get('otherObjectValue')).toBe(brain.getState().otherObjectValue);

    expect(pizza1.__brainIsProxy).toBeFalsy();
    expect(brain.getState().objectValue.__brainIsProxy).toBeTruthy();
    expect(brain.getState().objectValue.__brainTarget).toBe(pizza1);
    expect(brain.getState().objectValue.__brainChildren.size).toBe(0);
    expect(brain.getState().objectValue.__brainParents[0]).toBe(brain.getState());
    expect(brain.getState().objectValue.__brainFullPaths).toBeInstanceOf(Array);
    expect(brain.getState().objectValue.__brainFullPaths.length).toBe(1);
    expect(brain.getState().objectValue.__brainFullPaths[0]).toBe('objectValue');

    expect(pizza2.__brainIsProxy).toBeFalsy();
    expect(brain.getState().otherObjectValue.__brainIsProxy).toBeTruthy();
    expect(brain.getState().otherObjectValue.__brainTarget).toBe(pizza2);
    expect(brain.getState().otherObjectValue.__brainChildren.size).toBe(0);
    expect(brain.getState().otherObjectValue.__brainParents[0]).toBe(brain.getState());
    expect(brain.getState().otherObjectValue.__brainFullPaths).toBeInstanceOf(Array);
    expect(brain.getState().otherObjectValue.__brainFullPaths.length).toBe(1);
    expect(brain.getState().otherObjectValue.__brainFullPaths[0]).toBe('otherObjectValue');
  });

  it('Base principles: should reuse same proxy for same object', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });

    const pizza = { key: 'pizza' };
    brain.getState().objectValue = pizza;
    brain.getState().otherObjectValue = pizza;

    expect(brain.getState().__brainChildren.size).toBe(2);
    expect(brain.getState().__brainChildren.get('objectValue')).toBe(brain.getState().objectValue);
    expect(brain.getState().__brainChildren.get('otherObjectValue')).toBe(brain.getState().objectValue);
    expect(brain.getState().__brainChildren.get('objectValue')).toBe(brain.getState().otherObjectValue);
    expect(brain.getState().__brainChildren.get('otherObjectValue')).toBe(brain.getState().otherObjectValue);

    expect(pizza.__brainIsProxy).toBeFalsy();
    expect(brain.getState().objectValue.__brainIsProxy).toBeTruthy();
    expect(brain.getState().objectValue.__brainTarget).toBe(pizza);
    expect(brain.getState().objectValue.__brainChildren.size).toBe(0);
    expect(brain.getState().objectValue.__brainParents[0]).toBe(brain.getState());
    expect(brain.getState().objectValue.__brainFullPaths).toBeInstanceOf(Array);
    expect(brain.getState().objectValue.__brainFullPaths.length).toBe(2);
    expect(brain.getState().objectValue.__brainFullPaths[0]).toBe('objectValue');
    expect(brain.getState().objectValue.__brainFullPaths[1]).toBe('otherObjectValue');
  });

  it('Base principles: should add correctly parents for same proxy', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });

    const pizza = { key: 'pizza' };
    const pizzeria1 = { name: 'pizzeria1', specialPizza: pizza };
    const pizzeria2 = { name: 'pizzeria2', specialPizza: pizza };
    brain.getState().objectValue = pizzeria1;
    brain.getState().otherObjectValue = pizzeria2;

    expect(brain.getState().__brainChildren.size).toBe(2);

    expect((brain.getState().objectValue as any).specialPizza.__brainIsProxy).toBeTruthy();
    expect((brain.getState().otherObjectValue as any).specialPizza.__brainIsProxy).toBeTruthy();
    expect((brain.getState().objectValue as any).specialPizza).toBe(
      (brain.getState().otherObjectValue as any).specialPizza
    );
    expect((brain.getState().objectValue as any).specialPizza.__brainParents).toBeInstanceOf(Array);
    expect((brain.getState().objectValue as any).specialPizza.__brainParents.length).toBe(2);
    expect((brain.getState().objectValue as any).specialPizza.__brainParents[0]).toBe(brain.getState().objectValue);
    expect((brain.getState().objectValue as any).specialPizza.__brainParents[1]).toBe(
      brain.getState().otherObjectValue
    );
  });

  it('Base principles: should remove correctly parents for same proxy, but only if no more child has the same parent', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });

    const pizza = { key: 'pizza' };
    brain.getState().objectValue = pizza;

    expect(brain.getState().__brainChildren.size).toBe(1);
    expect(brain.getState().objectValue.__brainParents).toBeInstanceOf(Array);
    expect(brain.getState().objectValue.__brainParents.length).toBe(1);
    expect(brain.getState().objectValue.__brainParents[0]).toBe(brain.getState());

    brain.getState().otherObjectValue = pizza;
    expect(brain.getState().__brainChildren.size).toBe(2);
    expect(brain.getState().objectValue).toBe(brain.getState().otherObjectValue);
    expect(brain.getState().objectValue.__brainParents).toBeInstanceOf(Array);
    expect(brain.getState().objectValue.__brainParents.length).toBe(1); // Still 1 : same parent
    expect(brain.getState().objectValue.__brainParents[0]).toBe(brain.getState());

    // Remove the dupplicate
    // @ts-ignore
    brain.getState().objectValue = undefined;
    expect(brain.getState().__brainChildren.size).toBe(1);
    expect(brain.getState().otherObjectValue.__brainParents).toBeInstanceOf(Array);
    expect(brain.getState().otherObjectValue.__brainParents.length).toBe(1); // Still 1 : parent remains
    expect(brain.getState().otherObjectValue.__brainParents[0]).toBe(brain.getState());
  });

  it('Base principles: should remove correctly parents for same proxy', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });

    const pizza = { key: 'pizza' };
    const pizzeria1 = { name: 'pizzeria1', specialPizza: pizza };
    const pizzeria2 = { name: 'pizzeria2', specialPizza: pizza };
    brain.getState().objectValue = pizzeria1;
    brain.getState().otherObjectValue = pizzeria2;

    expect(brain.getState().__brainChildren.size).toBe(2);
    expect((brain.getState().objectValue as any).specialPizza.__brainIsProxy).toBeTruthy();
    expect((brain.getState().otherObjectValue as any).specialPizza.__brainIsProxy).toBeTruthy();
    expect((brain.getState().objectValue as any).specialPizza).toBe(
      (brain.getState().otherObjectValue as any).specialPizza
    );

    // Remove the dupplicate
    (brain.getState().objectValue as any).specialPizza = undefined;

    expect((brain.getState().objectValue as any).specialPizza?.__brainIsProxy).toBeFalsy();
    expect((brain.getState().otherObjectValue as any).specialPizza?.__brainIsProxy).toBeTruthy();
    expect((brain.getState().otherObjectValue as any).specialPizza.__brainParents).toBeInstanceOf(Array);
    expect((brain.getState().otherObjectValue as any).specialPizza.__brainParents.length).toBe(1);
    expect((brain.getState().otherObjectValue as any).specialPizza.__brainParents[0]).toBe(
      brain.getState().otherObjectValue
    );
    expect((brain.getState().otherObjectValue as any).specialPizza.__brainParents[0].__brainTarget).toBe(pizzeria2);
  });

  it('Base principles: should be able to affect proxy as new value', () => {
    brain = new Brain(state, () => {
      /* do nothing */
    });

    const pizza = { key: 'pizza' };
    brain.getState().objectValue = pizza;
    brain.getState().otherObjectValue = brain.getState().objectValue;

    expect(brain.getState().__brainChildren.size).toBe(2);
    expect(brain.getState().__brainChildren.get('objectValue')).toBe(brain.getState().objectValue);
    expect(brain.getState().__brainChildren.get('otherObjectValue')).toBe(brain.getState().objectValue);
    expect(brain.getState().__brainChildren.get('objectValue')).toBe(brain.getState().otherObjectValue);
    expect(brain.getState().__brainChildren.get('otherObjectValue')).toBe(brain.getState().otherObjectValue);

    expect(pizza.__brainIsProxy).toBeFalsy();
    expect(brain.getState().objectValue.__brainIsProxy).toBeTruthy();
    expect(brain.getState().objectValue.__brainTarget).toBe(pizza);
    expect(brain.getState().objectValue.__brainChildren.size).toBe(0);
    expect(brain.getState().objectValue.__brainParents[0]).toBe(brain.getState());
    expect(brain.getState().objectValue.__brainFullPaths).toBeInstanceOf(Array);
    expect(brain.getState().objectValue.__brainFullPaths.length).toBe(2);
    expect(brain.getState().objectValue.__brainFullPaths[0]).toBe('objectValue');
    expect(brain.getState().objectValue.__brainFullPaths[1]).toBe('otherObjectValue');
  });

  it('Base principles: old value should not be a proxy', () => {
    let controlValue = 1;
    brain = new Brain(state, (property, oldValue) => {
      controlValue++;
      expect(property).toBe('objectValue');
      expect(oldValue.__brainIsProxy).toBeFalsy();
    });

    const pizza1 = { key: 'pizza1' };
    const pizza2 = { key: 'pizza2' };
    expect(controlValue).toBe(1);
    brain.getState().objectValue = pizza1;
    expect(controlValue).toBe(2);
    brain.getState().objectValue = pizza2;
    expect(controlValue).toBe(3);
  });

  it('Base principles: old value should be frozen (not extensible)', () => {
    let controlValue = 1;
    brain = new Brain(state, (_property, oldValue) => {
      controlValue++;
      if (oldValue) {
        expect(() => {
          oldValue.key = 'pizza2';
        }).toThrowError();
      }
    });

    const pizza1 = { key: 'pizza1' };
    expect(controlValue).toBe(1);
    brain.getState().objectValue = pizza1;
    expect(controlValue).toBe(2);
  });

  it('Base principles: old value should be frozen (readonly properties)', () => {
    state = {
      objectValue: { key: 'pizza' },
      otherObjectValue: {}
    };
    let controlValue = 1;
    brain = new Brain(state, (_property, oldValue) => {
      controlValue++;
      if (oldValue) {
        expect(() => {
          oldValue.key = 'pizza2';
        }).toThrowError();
      }
    });

    const pizza1 = { key: 'pizza1' };
    expect(controlValue).toBe(1);
    brain.getState().objectValue = pizza1;
    expect(controlValue).toBe(2);
  });

  it('Base principles: old value should be frozen (array)', () => {
    state = {
      objectValue: [],
      otherObjectValue: {}
    };
    let controlValue = 1;
    brain = new Brain(state, (_property, oldValue) => {
      controlValue++;
      if (oldValue) {
        expect(() => {
          oldValue.push('pizza2');
        }).toThrowError();
      }
    });

    const pizza1 = ['pizza1'];
    expect(controlValue).toBe(1);
    brain.getState().objectValue = pizza1;
    expect(controlValue).toBe(2);
  });

  it('Base principles: old value should be frozen (circular references)', () => {
    const pizza1 = { ref: {} };
    const pizza2 = { ref: pizza1 };
    pizza1.ref = pizza2;

    state = {
      objectValue: pizza1,
      otherObjectValue: pizza2
    };
    let controlValue = 1;
    brain = new Brain(state, (_property, oldValue) => {
      controlValue++;
      if (oldValue) {
        expect(() => {
          oldValue.ref = {};
        }).toThrowError();
      }
    });

    brain.getState().objectValue = {};
    expect(controlValue).toBe(2);
  });

  it('Base principles: should only use main path for circular references', () => {
    const group = {
      type: 'group',
      children: [] as any[]
    };
    const layer = {
      type: 'layer',
      parent: group,
      active: false
    };
    group.children.push(layer);

    state = {
      objectValue: group,
      otherObjectValue: {}
    };
    brain = new Brain(state, () => {});

    // Access the same object under recursive paths
    (brain.getState().objectValue as any).children[0].active = true;
    (brain.getState().objectValue as any).children[0].parent.children[0].active = false;
    (brain.getState().objectValue as any).children[0].parent.children[0].parent.children[0].active = true;

    expect((brain.getState().objectValue as any).children[0].__brainFullPaths.length).toBe(1);
  });

  it('Base principles: should use multiple paths for different places in the state (no circular references)', () => {
    const group1 = { name: 'group1', children: [] as any[] };
    const group2 = { name: 'group2', children: [] as any[] };
    const group3 = { name: 'group3', children: [] as any[] };
    const layer = { name: 'layer', parent: group2, active: false };

    group1.children.push(group2);
    group3.children.push(group2);
    group2.children.push(layer);

    state = {
      objectValue: [group1, group3],
      otherObjectValue: {}
    };
    brain = new Brain(state, () => {});

    // Access the same object under recursive paths
    const g1 = (brain.getState().objectValue as any)[0];
    const g3 = (brain.getState().objectValue as any)[1];

    expect(g1.children[0].__brainIsProxy).toBeTruthy();
    expect(g1.children[0]).toBe(g3.children[0]);

    expect(g1.children[0].__brainFullPaths.length).toBe(2);
    expect(g1.children[0].__brainFullPaths[0]).toBe('objectValue.0.children.0');
    expect(g1.children[0].__brainFullPaths[1]).toBe('objectValue.1.children.0');

    g1.children[0].children[0].active = true;
    g1.children[0].children[0].parent.children[0].active = true;
    g1.children[0].children[0].parent.children[0].parent.children[0].active = true;

    expect(g1.children[0].__brainFullPaths.length).toBe(2);
    expect(g1.children[0].__brainFullPaths[0]).toBe('objectValue.0.children.0');
    expect(g1.children[0].__brainFullPaths[1]).toBe('objectValue.1.children.0');

    expect(g1.children[0].children[0].__brainFullPaths.length).toBe(2);
    expect(g1.children[0].children[0].__brainFullPaths[0]).toBe('objectValue.0.children.0.children.0');
    expect(g1.children[0].children[0].__brainFullPaths[1]).toBe('objectValue.1.children.0.children.0');
  });

  it('Base principles: should delay callbacks', () => {
    const pizza1 = { key: 'pizza1' };
    state.objectValue = pizza1;

    let counter = 1;
    brain = new Brain(state, (property, oldValue, newValue, parents) => {
      counter++;
      expect(property).toBe('objectValue.key');
      expect(oldValue).toBe('pizza1');
      expect(newValue).toBe('pizza4');
      expect(parents).toBeInstanceOf(Array);
      expect(parents[0]).toBe(brain.getState().objectValue);
    });

    brain.delay((proxy) => {
      (proxy.objectValue as any).key = 'pizza2';
      expect(counter).toBe(1);
      (proxy.objectValue as any).key = 'pizza3';
      expect(counter).toBe(1);
      (proxy.objectValue as any).key = 'pizza4';
      expect(counter).toBe(1);
    });

    expect(counter).toBe(2);
  });

  it('Base principles: Do not clone objects with attribute BrainIgnoreClone', () => {
    class Pizza {
      key: string;
      @BrainIgnoreClone
      owner: object;

      constructor(key: string, owner: object) {
        this.key = key;
        this.owner = owner;
      }
    }

    const pizzeria = {
      name: 'Noninna',
      place: 'Aspach'
    };
    const pizza1 = new Pizza('pizza1', pizzeria);
    const pizza2 = new Pizza('pizza2', pizzeria);

    state.objectValue = pizza1;
    let counter = 1;
    brain = new Brain(state, (property, oldValue, newValue) => {
      counter++;
      expect(property).toBe('objectValue');
      expect(oldValue.owner).toBe(pizzeria);
      expect(newValue.owner.__brainTarget).toBe(pizzeria);
    });

    brain.getState().objectValue = pizza2;
    expect(counter).toBe(2);
  });

  it('Base principles: Do not clone objects with attribute BrainIgnoreClone, but listen to changes', () => {
    class Pizza {
      key: string;
      @BrainIgnoreClone
      owner: object;

      constructor(key: string, owner: object) {
        this.key = key;
        this.owner = owner;
      }
    }

    const pizzeria = {
      name: 'Noninna',
      place: 'Aspach'
    };
    const pizza1 = new Pizza('pizza1', pizzeria);

    state.objectValue = pizza1;
    let counter = 1;
    brain = new Brain(state, (property, oldValue, newValue) => {
      counter++;
      expect(property).toBe('objectValue.owner.place');
      expect(oldValue).toBe('Aspach');
      expect(newValue).toBe('Bernwiller');
    });

    (brain.getState().objectValue as any).owner.place = 'Bernwiller';
    expect(counter).toBe(2);
  });

  it('Base principles: Handles multiple parents referencing the same object', () => {
    const shared = { id: 42 };
    state.objectValue = { child: shared };
    state.otherObjectValue = { child: shared };

    brain = new Brain(state, () => {});
    const proxyState = brain.getState();

    const pSharedA = (proxyState.objectValue as any).child;
    const pSharedB = (proxyState.otherObjectValue as any).child;

    // Both references point to the same proxy
    expect(pSharedA).toBe(pSharedB);

    // That proxy has two parents
    expect(pSharedA.__brainParents.length).toBe(2);
    expect(pSharedA.__brainParents).toEqual(
      expect.arrayContaining([proxyState.objectValue, proxyState.otherObjectValue])
    );

    // And two full paths
    expect(pSharedA.__brainFullPaths).toEqual(expect.arrayContaining(['objectValue.child', 'otherObjectValue.child']));
  });

  it('Base principles: should not create a proxy if is already a proxy)', () => {
    /* This can happen when a proxy was added to a not proxied object
       And then if the not proxied object is added to the state.
       In this case, brain should not recreate a proxy but simply reuse it.
     */
    brain = new Brain(state, () => {
      /* do nothing */
    });
    const pizza = { key: 'pizza1' };
    brain.getState().objectValue = pizza;
    const pizzaProxy = brain.getState().objectValue;
    expect(pizzaProxy.__brainIsProxy).toBeTruthy();

    class Pizzeria {
      pizza: {};

      constructor(pizza: {}) {
        this.pizza = pizza;
      }
    }

    const pizzeria = new Pizzeria(pizzaProxy);
    brain.getState().otherObjectValue = pizzeria;
    const otherPizzaProxy = (brain.getState().otherObjectValue as Pizzeria).pizza;
    expect(otherPizzaProxy.__brainIsProxy).toBeTruthy();

    expect(pizzaProxy).toBe(otherPizzaProxy);
  });
});
