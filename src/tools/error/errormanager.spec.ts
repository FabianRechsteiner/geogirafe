import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import StateManager from '../state/statemanager';
import ErrorManager from './errormanager';
import MockHelper from '../tests/mockhelper';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid')
}));

describe('ErrorManager', () => {
  beforeEach(() => {
    MockHelper.startMocking();
    ErrorManager.getInstance();
    StateManager.getInstance().state.infobox.elements.length = 0;
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  it('should listen to all uncaught errors and add error message to infobox', () => {
    const error = new Error('Test error');
    const stack = 'Error stack trace';
    error.stack = stack;

    window.onerror!(error.message, 'testfile.js', 10, 20, error);

    expect(StateManager.getInstance().state.infobox.elements.length).toEqual(1);
    const element = StateManager.getInstance().state.infobox.elements[0];
    expect(element.id).toEqual('mock-uuid');
    expect(element.type).toEqual('error');
    expect(element.text).toContain(encodeURIComponent('Error stack trace'));
    expect(element.text).toContain(encodeURIComponent('Test error'));
  });

  it('should listen to all unhandledrejection and add error message to infobox', () => {
    const reason = new Error('Unhandled rejection');
    const stack = 'Rejection stack trace';
    reason.stack = stack;

    const event = new CustomEvent('unhandledrejection', { detail: { reason } });
    Object.assign(event, { reason });
    window.dispatchEvent(event);

    expect(StateManager.getInstance().state.infobox.elements.length).toEqual(1);
    const element = StateManager.getInstance().state.infobox.elements[0];
    expect(element.id).toEqual('mock-uuid');
    expect(element.type).toEqual('error');
    expect(element.text).toContain(encodeURIComponent('Rejection stack trace'));
    expect(element.text).toContain(encodeURIComponent('Unhandled rejection'));
  });

  it('should handle unknown rejection without reason and stack', () => {
    const event = new CustomEvent('unhandledrejection', { detail: {} });
    Object.assign(event, {});
    window.dispatchEvent(event);

    expect(StateManager.getInstance().state.infobox.elements.length).toEqual(1);
    const element = StateManager.getInstance().state.infobox.elements[0];
    expect(element.id).toEqual('mock-uuid');
    expect(element.type).toEqual('error');
  });

  it('should add all errors to infobox', () => {
    const error = new Error('Test error');

    window.onerror!(error.message, 'testfile.js', 10, 20, error);
    expect(StateManager.getInstance().state.infobox.elements.length).toEqual(1);

    window.onerror!(error.message, 'testfile.js', 10, 20, error);
    expect(StateManager.getInstance().state.infobox.elements.length).toEqual(2);

    const event = new CustomEvent('unhandledrejection', { detail: {} });
    Object.assign(event, {});
    window.dispatchEvent(event);
    expect(StateManager.getInstance().state.infobox.elements.length).toEqual(3);
  });
});
