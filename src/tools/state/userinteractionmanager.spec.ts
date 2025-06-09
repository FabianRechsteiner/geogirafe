import UserInteractionManager from './userInteractionManager';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import StateManager from './statemanager';
import MockHelper from '../tests/mockhelper';

let manager: UserInteractionManager;
let stateManager: StateManager;

beforeAll(() => {
  MockHelper.startMocking();
  manager = UserInteractionManager.getInstance();
  stateManager = StateManager.getInstance();
});

describe('InteractionManager.registerListener', () => {
  const event = 'map.mouseclick';

  beforeEach(() => {
    stateManager.state.userInteractionListeners = [];
  });

  it('adds listener to the state', () => {
    expect(manager.registerListener(event, false, 'listener')).toBe(true);
    expect(stateManager.state.userInteractionListeners.length).toBe(1);
  });

  it('does not add a duplicate listener to the state', () => {
    expect(manager.registerListener(event, false, 'listener')).toBe(true);
    expect(manager.registerListener(event, false, 'listener')).toBe(false);
    expect(stateManager.state.userInteractionListeners.length).toBe(1);
  });

  it('registers a exclusive listener alongside a non-exclusive listener', () => {
    manager.registerListener(event, false, 'listener');
    expect(manager.registerListener(event, true, 'exclusiveListener')).toBe(true);
    expect(stateManager.state.userInteractionListeners.length).toBe(2);
    expect(stateManager.state.userInteractionListeners.map((l) => l.toolName)).toContain('listener');
    expect(stateManager.state.userInteractionListeners.map((l) => l.toolName)).toContain('exclusiveListener');
  });

  it('falls back to the previous listeners when an exclusive listener unregisters', () => {
    manager.registerListener(event, false, 'listener1');
    manager.registerListener(event, false, 'listener2');
    manager.registerListener(event, true, 'exclusiveListener');
    expect(stateManager.state.userInteractionListeners.length).toBe(3);
    manager.unregisterListener(event, 'exclusiveListener');
    expect(stateManager.state.userInteractionListeners.length).toBe(2);
    expect(stateManager.state.userInteractionListeners.map((l) => l.toolName)).toContain('listener1');
    expect(stateManager.state.userInteractionListeners.map((l) => l.toolName)).toContain('listener2');
  });

  it('replaces the previous exclusive listener with a new exclusive listener', () => {
    expect(manager.registerListener(event, false, 'listener1')).toBe(true);
    expect(manager.registerListener(event, false, 'listener2')).toBe(true);
    expect(manager.registerListener(event, true, 'exclusiveListener1')).toBe(true);
    expect(stateManager.state.userInteractionListeners.length).toBe(3);
    expect(manager.registerListener(event, true, 'exclusiveListener2')).toBe(true);
    expect(stateManager.state.userInteractionListeners.length).toBe(3);
    expect(stateManager.state.userInteractionListeners.map((l) => l.toolName)).toContain('listener1');
    expect(stateManager.state.userInteractionListeners.map((l) => l.toolName)).toContain('listener2');
    expect(stateManager.state.userInteractionListeners.map((l) => l.toolName)).toContain('exclusiveListener2');
  });

  it('does not change listeners of other events when adding an exclusive listener to an event', () => {
    expect(manager.registerListener(event, false, 'listener1')).toBe(true);
    expect(manager.registerListener(event, false, 'listener2')).toBe(true);
    expect(manager.registerListener(event, true, 'exclusiveListener1')).toBe(true);
    const event2 = 'map.mousemove';
    expect(manager.registerListener(event2, false, 'listener1')).toBe(true);
    expect(manager.registerListener(event2, false, 'listener2')).toBe(true);
    expect(manager.registerListener(event2, true, 'exclusiveListener1')).toBe(true);
    expect(stateManager.state.userInteractionListeners.length).toBe(6);

    expect(manager.registerListener(event, true, 'exclusiveListener2')).toBe(true);
    expect(stateManager.state.userInteractionListeners.length).toBe(6);
    expect(stateManager.state.userInteractionListeners.filter((l) => l.eventName === event2).length).toBe(3);
    expect(
      stateManager.state.userInteractionListeners.filter((l) => l.eventName === event2 && l.isExclusive).length
    ).toBe(1);
  });
});

describe('InteractionManager.canListenerExecute', () => {
  const event = 'map.mouseclick';
  const compoundEvent = 'map.draw';

  beforeEach(() => {
    stateManager.state.userInteractionListeners = [];
  });

  it('allows execution if the listener has successfully registered', () => {
    manager.registerListener(event, false, 'listener');
    expect(manager.canListenerExecute(event, 'listener')).toBe(true);
  });

  it('allows execution of multiple listeners of the same event if they all registered as non-exclusive', () => {
    manager.registerListener(event, false, 'listener1');
    manager.registerListener(event, false, 'listener2');
    expect(manager.canListenerExecute(event, 'listener1')).toBe(true);
    expect(manager.canListenerExecute(event, 'listener2')).toBe(true);
  });

  it('prevents execution if listener has been unregistered in the meantime', () => {
    manager.registerListener(event, false, 'listener');
    expect(manager.canListenerExecute(event, 'listener')).toBe(true);
    manager.unregisterListener(event, 'listener');
    expect(manager.canListenerExecute(event, 'listener')).toBe(false);
  });

  it('prevents execution of a listener if there is an exclusive listener for the same event', () => {
    manager.registerListener(event, false, 'listener');
    manager.registerListener(event, true, 'exclusiveListener');
    expect(manager.canListenerExecute(event, 'listener')).toBe(false);
    expect(manager.canListenerExecute(event, 'exclusiveListener')).toBe(true);
  });

  it('allows execution of a listener if the exclusive listener has been unregistered', () => {
    manager.registerListener(event, false, 'listener');
    manager.registerListener(event, true, 'exclusiveListener');
    manager.unregisterListener(event, 'exclusiveListener');
    expect(manager.canListenerExecute(event, 'listener')).toBe(true);
    expect(manager.canListenerExecute(event, 'exclusiveListener')).toBe(false);
  });

  it('ignores exclusive listeners for other events', () => {
    const event2 = 'map.mousemove';
    manager.registerListener(event, false, 'listener');
    manager.registerListener(event2, false, 'listener');
    manager.registerListener(event, true, 'exclusiveListener');
    expect(manager.canListenerExecute(event, 'listener')).toBe(false);
    expect(manager.canListenerExecute(event, 'exclusiveListener')).toBe(true);
    expect(manager.canListenerExecute(event2, 'listener')).toBe(true);
  });

  it('prevents execution of simple event listener if a exclusive compound event listener registers', () => {
    manager.registerListener(event, false, 'listener');
    manager.registerListener(compoundEvent, true, 'exclusiveListener');
    expect(manager.canListenerExecute(event, 'listener')).toBe(false);
    expect(manager.canListenerExecute(compoundEvent, 'exclusiveListener')).toBe(true);
  });

  it('reactivates execution rights of simple event listener if a compound event listener unregisters', () => {
    manager.registerListener(event, false, 'listener');
    manager.registerListener(compoundEvent, true, 'exclusiveListener');
    manager.unregisterListener(compoundEvent, 'exclusiveListener');
    expect(manager.canListenerExecute(event, 'listener')).toBe(true);
    expect(manager.canListenerExecute(compoundEvent, 'exclusiveListener')).toBe(false);
  });
});
