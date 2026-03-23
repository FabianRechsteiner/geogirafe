// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import MockHelper from '../tests/mockhelper';
import IGirafeContext from '../context/icontext';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid')
}));

describe('ErrorManager', () => {
  let context: IGirafeContext;
  beforeEach(() => {
    context = MockHelper.startMocking();
    context.stateManager.state.infobox.elements.length = 0;
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('should listen to all uncaught errors and add error message to infobox', async () => {
    const error = new Error('Test error');
    const stack = 'Error stack trace';
    error.stack = stack;

    await window.onerror!(error.message, 'testfile.js', 10, 20, error);

    expect(context.stateManager.state.infobox.elements.length).toEqual(1);
    const element = context.stateManager.state.infobox.elements[0];
    expect(element.id).toEqual('mock-uuid');
    expect(element.type).toEqual('error');
    expect(element.text).toContain(encodeURIComponent('Error stack trace'));
    expect(element.text).toContain(encodeURIComponent('Test error'));
  });

  it('should listen to all unhandledrejection and add error message to infobox', async () => {
    const reason = new Error('Unhandled rejection');
    const stack = 'Rejection stack trace';
    reason.stack = stack;

    const event = new CustomEvent('unhandledrejection', { detail: { reason } });
    Object.assign(event, { reason });
    await window.dispatchEvent(event);

    expect(context.stateManager.state.infobox.elements.length).toEqual(1);
    const element = context.stateManager.state.infobox.elements[0];
    expect(element.id).toEqual('mock-uuid');
    expect(element.type).toEqual('error');
    expect(element.text).toContain(encodeURIComponent('Rejection stack trace'));
    expect(element.text).toContain(encodeURIComponent('Unhandled rejection'));
  });

  it('should handle unknown rejection without reason and stack', async () => {
    const event = new CustomEvent('unhandledrejection', { detail: {} });
    Object.assign(event, {});
    await window.dispatchEvent(event);

    expect(context.stateManager.state.infobox.elements.length).toEqual(1);
    const element = context.stateManager.state.infobox.elements[0];
    expect(element.id).toEqual('mock-uuid');
    expect(element.type).toEqual('error');
  });

  it('should add all errors to infobox', async () => {
    const error = new Error('Test error');
    await window.onerror!(error.message, 'testfile.js', 10, 20, error);
    expect(context.stateManager.state.infobox.elements.length).toEqual(1);

    const error2 = new Error('Test error 2');
    await window.onerror!(error.message, 'testfile2.js', 10, 20, error2);
    expect(context.stateManager.state.infobox.elements.length).toEqual(2);

    const event = new CustomEvent('unhandledrejection', { detail: {} });
    Object.assign(event, { error });
    await window.dispatchEvent(event);
    expect(context.stateManager.state.infobox.elements.length).toEqual(3);
  });

  it('should not add dupplicated errors to infobox', async () => {
    const error = new Error('Test error');

    await window.onerror!(error.message, 'testfile.js', 10, 20, error);
    expect(context.stateManager.state.infobox.elements.length).toEqual(1);

    await window.onerror!(error.message, 'testfile.js', 10, 20, error);
    expect(context.stateManager.state.infobox.elements.length).toEqual(1);
  });
});
