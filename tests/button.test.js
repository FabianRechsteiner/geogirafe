import ButtonComponent from '../src/components/button/component';
import fs from 'fs';
import {jest} from '@jest/globals'

describe('ButtonComponent', () => {
  let buttonComponent;

  beforeEach(() => {
    // Create Element
    buttonComponent = new ButtonComponent();
    // Read and set template from local file (bypass fetch)
    const content = fs.readFileSync('./src/components/button/template.html', 'utf8');
    const template = document.createElement('template');
    template.innerHTML = content;
    // Override the default tempalte getter of the element in order to return always the template.
    Object.defineProperty(buttonComponent, "template", {
      get: function () { return template; }
    });
  });

  test('render creates a button element', () => {
    buttonComponent.render();
    expect(buttonComponent.shadow.querySelector('#button')).toBeTruthy();
  });

  test('render adds icon element if icon-style attribute is set', () => {
    buttonComponent.setAttribute('icon-style', 'fa fa-test');
    buttonComponent.render();
    expect(buttonComponent.icon.className).toBe('fa fa-test');
  });
 
  test('render adds text element if text attribute is set', () => {
    buttonComponent.setAttribute('text', 'Test Text');
    buttonComponent.render();
    expect(buttonComponent.textSpan.innerHTML).toBe('Test Text');
  });
 
  test('setText updates text element if text is provided', () => {
    buttonComponent.setAttribute('text', 'Test Text');
    buttonComponent.render();
    buttonComponent.setText('New Text');
    expect(buttonComponent.textSpan.innerHTML).toBe('New Text');
  });
 
  test('setText removes text element if text is not provided', () => {
    buttonComponent.setAttribute('text', 'Test Text');
    buttonComponent.render();
    buttonComponent.setText(null);
    expect(buttonComponent.textSpan).toBe(null);
  });
 
  test('registerEvents adds click event listener to button', () => {
    buttonComponent.render();
    jest.spyOn(buttonComponent.button, 'addEventListener');
    buttonComponent.registerEvents();
    expect(buttonComponent.button.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });
 
  test('onClick opens a new tab if href attribute is set', () => {
    jest.spyOn(window, 'open');
    buttonComponent.setAttribute('href', 'https://test.com');
    buttonComponent.render();
    buttonComponent.registerEvents();
    buttonComponent.onClick();
    expect(window.open).toHaveBeenCalledWith('https://test.com', '_blank');
  });

  test('set hybrid class when both icon and text are present', () => {
    buttonComponent.setAttribute('icon-style', 'fa fa-check');
    buttonComponent.setAttribute('text', 'Click me');
    buttonComponent.render();
    expect(buttonComponent.button.className).toBe('hybrid');
  });

  test('should add a click event listener to the button', () => {
    buttonComponent.render();
    const spy = jest.spyOn(buttonComponent.button, 'addEventListener');
    buttonComponent.registerEvents();
    expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
  });

  test('should set the href if the element has an href attribute', () => {
    buttonComponent.render();
    buttonComponent.setAttribute('href', 'https://www.example.com');
    buttonComponent.registerEvents();
    expect(buttonComponent.href).toEqual('https://www.example.com');
  });

  test('should set the geoevent and options if the element has message and action attributes', () => {
    buttonComponent.render();
    buttonComponent.setAttribute('message', 'Map');
    buttonComponent.setAttribute('action', 'test-action');
    buttonComponent.registerEvents();
    expect(buttonComponent.geoevent).toEqual(buttonComponent.getGeoEventType('Map'));
    expect(buttonComponent.options).toEqual({ action: 'test-action' });
  });
});
