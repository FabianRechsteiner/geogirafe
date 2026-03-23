// SPDX-License-Identifier: Apache-2.0
import { describe, it, beforeAll, assert, afterAll, expect, beforeEach, afterEach } from 'vitest';
import GirafeHTMLElement from './GirafeHTMLElement';
import MockHelper from '../tools/tests/mockhelper';
import IGirafeContext from '../tools/context/icontext';

class GirafeHTMLTestElement extends GirafeHTMLElement {}

describe('GirafeHTMLElement.isNullOrUndefined', () => {
  let element: GirafeHTMLElement;
  let context: IGirafeContext;
  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeHTMLTestElement);
    }
    element = new GirafeHTMLTestElement('girafe-test', context);
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('isNullOrUndefined tests', () => {
    // @ts-expect-error: private property
    expect(element.isNullOrUndefined(undefined)).toBe(true);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefined(null)).toBe(true);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefined('')).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefined(0)).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefined(false)).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefined('string')).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefined({})).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefined([])).toBe(false);
  });
});

describe('GirafeHTMLElement.isNullOrUndefinedOrBlank', () => {
  let element: GirafeHTMLElement;
  let context: IGirafeContext;
  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeHTMLTestElement);
    }
    element = new GirafeHTMLTestElement('girafe-test', context);
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('isNullOrUndefinedOrBlank tests', () => {
    // @ts-expect-error: private property
    expect(element.isNullOrUndefinedOrBlank(undefined)).toBe(true);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefinedOrBlank(null)).toBe(true);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefinedOrBlank('')).toBe(true);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefinedOrBlank(0)).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefinedOrBlank(false)).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefinedOrBlank('string')).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefinedOrBlank({})).toBe(false);
    // @ts-expect-error: private property
    expect(element.isNullOrUndefinedOrBlank([])).toBe(false);
  });
});

describe('GirafeHTMLElement.getParentOfType', () => {
  let element: GirafeHTMLElement;
  let context: IGirafeContext;

  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeHTMLTestElement);
    }
    element = new GirafeHTMLTestElement('girafe-test', context);
    document.body.appendChild(element);
  });

  afterAll(() => {
    document.body.removeChild(element);
    MockHelper.stopMocking(context);
  });

  it('should return null if the element is null', () => {
    // @ts-expect-error: private property
    expect(element.getParentOfType('DIV', null)).toBe(null);
  });

  it('should NOT return the element if it matches the parentNodeName', () => {
    const divElement = document.createElement('div');
    // @ts-expect-error: private property
    expect(element.getParentOfType('DIV', divElement)).not.toBe(divElement);
  });

  it('should return the parent if the parent matches the parentNodeName', () => {
    const parentDiv = document.createElement('div');
    const childSpan = document.createElement('span');
    parentDiv.appendChild(childSpan);
    // @ts-expect-error: private property
    expect(element.getParentOfType('DIV', childSpan)).toBe(parentDiv);
  });

  it('should return null if no matching parent is found', () => {
    const parentDiv = document.createElement('div');
    const childSpan = document.createElement('span');
    parentDiv.appendChild(childSpan);
    // @ts-expect-error: private property
    expect(element.getParentOfType('SECTION', childSpan)).toBe(null);
  });

  it('should find the parent through multiple levels', () => {
    const grandParentDiv = document.createElement('div');
    const parentDiv = document.createElement('div');
    const childSpan = document.createElement('span');
    grandParentDiv.appendChild(parentDiv);
    parentDiv.appendChild(childSpan);
    // @ts-expect-error: private property
    expect(element.getParentOfType('DIV', childSpan)).toBe(parentDiv);
    // @ts-expect-error: private property
    expect(element.getParentOfType('DIV', parentDiv)).toBe(grandParentDiv);
  });

  it('should handle Shadow DOM correctly', () => {
    const shadowHost = document.createElement('div');
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    const shadowChild = document.createElement('span');
    shadowRoot.appendChild(shadowChild);
    document.body.appendChild(shadowHost);
    // @ts-expect-error: private property
    expect(element.getParentOfType('DIV', shadowChild)).toBe(shadowHost);
    document.body.removeChild(shadowHost);
  });
});

describe('GirafeHTMLElement.getUnsafeTemplate', () => {
  let context: IGirafeContext;
  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeHTMLTestElement);
    }
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should create two different templates', () => {
    const element = new GirafeHTMLTestElement('girafe-test', context);
    // @ts-ignore
    const template1 = element.getUnsafeTemplate('toto');
    // @ts-ignore
    const template2 = element.getUnsafeTemplate('titi');

    assert.notStrictEqual(template1, template2);
  });

  it('should return cached object and not create a new one', () => {
    const element = new GirafeHTMLTestElement('girafe-test', context);
    const str = 'toto';
    // @ts-ignore
    const template1 = element.getUnsafeTemplate(str);
    // @ts-ignore
    const template2 = element.getUnsafeTemplate(str);

    assert.strictEqual(template1, template2);
  });
});

describe('GirafeHTMLElement.defineDisplayStyle', () => {
  let element: GirafeHTMLElement;
  let context: IGirafeContext;

  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeHTMLTestElement);
    }
  });

  beforeEach(() => {
    element = new GirafeHTMLTestElement('girafe-test', context);
    document.body.appendChild(element);
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should set displayStyle to computed display value if not already set', () => {
    // Simulate initial display style
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        display: 'inline-block'
      }),
      writable: true
    });

    // @ts-ignore
    element.defineDisplayStyle();
    // @ts-expect-error: private property
    expect(element.displayStyle).toBe('inline-block');
  });

  it('should set displayStyle to block if computed display is none', () => {
    // Simulate initial display style
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        display: 'none'
      }),
      writable: true
    });

    // @ts-ignore
    element.defineDisplayStyle();
    // @ts-expect-error: private property
    expect(element.displayStyle).toBe('block');
  });

  it('should not change displayStyle if already set', () => {
    // @ts-expect-error: private property
    element.displayStyle = 'flex';

    // Simulate initial display style
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        display: 'inline-block'
      }),
      writable: true
    });

    // @ts-ignore
    element.defineDisplayStyle();
    // @ts-expect-error: private property
    expect(element.displayStyle).toBe('flex');
  });

  it('should default to block if computed style is undefined', () => {
    // Simulate initial display style
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        display: undefined
      }),
      writable: true
    });

    // @ts-ignore
    element.defineDisplayStyle();
    // @ts-expect-error: private property
    expect(element.displayStyle).toBe('block');
  });
});

describe('GirafeHTMLElement.simulateClick', () => {
  let element: GirafeHTMLElement;
  let context: IGirafeContext;

  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeHTMLTestElement);
    }
    element = new GirafeHTMLTestElement('girafe-test', context);
    document.body.appendChild(element);
  });

  afterAll(() => {
    document.body.removeChild(element);
    MockHelper.stopMocking(context);
  });

  it('should click the target element on Enter key press', () => {
    let controlValue = 0;
    element.onclick = () => {
      controlValue = 1;
    };
    element.onkeydown = (e) => {
      // @ts-expect-error: private property
      element.simulateClick(e);
    };

    expect(controlValue).toBe(0);
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    element.dispatchEvent(keyboardEvent);
    expect(controlValue).toBe(1);
  });

  it('should click the target element on Space key press', () => {
    let controlValue = 0;
    element.onclick = () => {
      controlValue = 1;
    };
    element.onkeydown = (e) => {
      // @ts-expect-error: private property
      element.simulateClick(e);
    };

    expect(controlValue).toBe(0);
    const keyboardEvent = new KeyboardEvent('keydown', { key: ' ' });
    element.dispatchEvent(keyboardEvent);
    expect(controlValue).toBe(1);
  });

  it('should NOT click if key is not Enter or Space', () => {
    let controlValue = 0;
    element.onclick = () => {
      controlValue = 1;
    };
    element.onkeydown = (e) => {
      // @ts-expect-error: private property
      element.simulateClick(e);
    };

    expect(controlValue).toBe(0);
    const keyboardEvent = new KeyboardEvent('keydown', { key: 'A' });
    element.dispatchEvent(keyboardEvent);
    expect(controlValue).toBe(0);
  });
});
