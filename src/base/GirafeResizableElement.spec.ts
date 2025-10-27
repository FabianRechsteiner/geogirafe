import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import GirafeResizableElement from './GirafeResizableElement';
import MockHelper from '../tools/tests/mockhelper';
import IGirafeContext from '../tools/context/icontext';

describe('GirafeResizableElement.constructor', () => {
  let resizableElement: GirafeResizableElement;
  let context: IGirafeContext;

  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeResizableElement);
    }
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should initialize dock property to default value (right)', () => {
    resizableElement = new GirafeResizableElement('girafe-test');
    expect(resizableElement.dock).toBe('right');
  });

  it('should initialize dock property to value left', () => {
    resizableElement = new GirafeResizableElement('girafe-test', 'left');
    expect(resizableElement.dock).toBe('left');
  });

  it('should initialize dock property to value right', () => {
    resizableElement = new GirafeResizableElement('girafe-test', 'right');
    expect(resizableElement.dock).toBe('right');
  });

  it('should initialize dock property to value bottom', () => {
    resizableElement = new GirafeResizableElement('girafe-test', 'bottom');
    expect(resizableElement.dock).toBe('bottom');
  });

  it('should initialize dock property to value bottom', () => {
    expect(() => {
      // @ts-ignore
      resizableElement = new GirafeResizableElement('girafe-test', 'invalid');
    }).toThrowError();
  });
});

describe('GirafeResizableElement.makeResizable', () => {
  let resizableElement: GirafeResizableElement;
  let context: IGirafeContext;

  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeResizableElement);
    }
    resizableElement = new GirafeResizableElement('girafe-test');
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div id="gutter"></div>
      <button id="hide"></button>
      <button id="close"></button>
    `;
    resizableElement.shadow.appendChild(panel);
    resizableElement.makeResizable();
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should initialize gutter element', () => {
    expect(resizableElement.gutter).toBeDefined();
    expect(resizableElement.gutter!.id).toBe('gutter');
  });

  it('should initialize closeButton element', () => {
    expect(resizableElement.closeButton).toBeDefined();
    expect(resizableElement.closeButton!.id).toBe('close');
  });

  it('should set gutter onmousedown handler', () => {
    expect(typeof resizableElement.gutter!.onmousedown).toBe('function');
  });

  it('should set gutter ondblclick handler', () => {
    expect(typeof resizableElement.gutter!.ondblclick).toBe('function');
  });

  it('should set closeButton onclick handler if closeButton exists', () => {
    expect(typeof resizableElement.closeButton!.onclick).toBe('function');
  });

  it('should initialize toggleSize based on gutter dimensions', () => {
    const gutterRect = resizableElement.gutter!.getBoundingClientRect();
    const expectedSize = resizableElement.dock === 'bottom' ? gutterRect.height : gutterRect.width;
    expect(resizableElement.toggleSize).toBe(expectedSize);
  });
});

describe('GirafeResizableElement.initSizeLimits', () => {
  let resizableElement: GirafeResizableElement;
  let context: IGirafeContext;

  beforeAll(() => {
    context = MockHelper.startMocking();
    if (!customElements.get('girafe-test')) {
      customElements.define('girafe-test', GirafeResizableElement);
    }
    resizableElement = new GirafeResizableElement('girafe-test');
    const panel = document.createElement('div');
    panel.innerHTML = `
      <div id="gutter"></div>
      <button id="hide"></button>
      <button id="close"></button>
    `;
    resizableElement.shadow.appendChild(panel);
    resizableElement.makeResizable();
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should initialize min/max based on CSS properties', () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          minWidth: '100px',
          maxWidth: '300px',
          minHeight: '50px',
          maxHeight: '200px'
        }) as CSSStyleDeclaration
    );
    // @ts-ignore
    resizableElement.initSizeLimits();

    expect(resizableElement.minWidth).toBe(100);
    expect(resizableElement.maxWidth).toBe(300);
    expect(resizableElement.minHeight).toBe(50);
    expect(resizableElement.maxHeight).toBe(200);
  });

  it('should set min/max to undefined if CSS property is not set', () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          minWidth: '',
          maxWidth: '',
          minHeight: '',
          maxHeight: ''
        }) as CSSStyleDeclaration
    );
    // @ts-ignore
    resizableElement.initSizeLimits();

    expect(resizableElement.minWidth).toBeUndefined();
    expect(resizableElement.maxWidth).toBeUndefined();
    expect(resizableElement.minHeight).toBeUndefined();
    expect(resizableElement.maxHeight).toBeUndefined();
  });
});
