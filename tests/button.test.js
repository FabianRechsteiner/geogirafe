import ButtonComponent from '../src/components/button/component';
import fs from 'fs';
import {jest} from '@jest/globals'

describe('ButtonComponent', () => {
  let component;

  beforeEach(() => {
    // Create Element
    component = new ButtonComponent();
    // Read and set template from local file (bypass fetch)
    const templateFilePath = './src' + component.templateUrl;
    const content = fs.readFileSync(templateFilePath, 'utf8');
    const template = document.createElement('template');
    template.innerHTML = content;
    // Override the default tempalte getter of the element in order to return always the template.
    Object.defineProperty(component, "template", {
      get: function () { return template; }
    });
  });

  test('render creates a button element', () => {
    component.render();
    expect(component.shadow.querySelector('#button')).toBeTruthy();
  });

  test('render adds icon element if icon-style attribute is set', () => {
    component.setAttribute('icon-style', 'fa fa-test');
    component.render();
    expect(component.icon.className).toBe('fa fa-test');
  });
 
  test('render adds text element if text attribute is set', () => {
    component.setAttribute('text', 'Test Text');
    component.render();
    expect(component.textSpan.innerHTML).toBe('Test Text');
  });
 
  test('setText updates text element if text is provided', () => {
    component.setAttribute('text', 'Test Text');
    component.render();
    component.setText('New Text');
    expect(component.textSpan.innerHTML).toBe('New Text');
  });
 
  test('setText removes text element if text is not provided', () => {
    component.setAttribute('text', 'Test Text');
    component.render();
    component.setText(null);
    expect(component.textSpan).toBe(null);
  });
 
  test('registerEvents adds click event listener to button', () => {
    component.render();
    jest.spyOn(component.button, 'addEventListener');
    component.registerEvents();
    expect(component.button.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });
 
  test('onClick opens a new tab if href attribute is set', () => {
    jest.spyOn(window, 'open');
    component.setAttribute('href', 'https://test.com');
    component.render();
    component.registerEvents();
    component.onClick();
    expect(window.open).toHaveBeenCalledWith('https://test.com', '_blank');
  });

  test('set hybrid class when both icon and text are present', () => {
    component.setAttribute('icon-style', 'fa fa-check');
    component.setAttribute('text', 'Click me');
    component.render();
    expect(component.button.className).toBe('hybrid');
  });

  test('should add a click event listener to the button', () => {
    component.render();
    const spy = jest.spyOn(component.button, 'addEventListener');
    component.registerEvents();
    expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
  });

  test('should set the href if the element has an href attribute', () => {
    component.render();
    component.setAttribute('href', 'https://www.example.com');
    component.registerEvents();
    expect(component.href).toEqual('https://www.example.com');
  });

  test('should set the geoevent and options if the element has message and action attributes', () => {
    component.render();
    component.setAttribute('message', 'Map');
    component.setAttribute('action', 'test-action');
    component.registerEvents();
    expect(component.geoevent).toEqual(component.getGeoEventType('Map'));
    expect(component.options).toEqual({ action: 'test-action' });
  });
});
