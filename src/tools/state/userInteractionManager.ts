import GirafeSingleton from '../../base/GirafeSingleton';
import StateManager from './statemanager';
import { gGEventDependencies, GgUserInteractionEvent } from './userinteractionevent';

/**
 * The GgUserInteractionListener interface is used to save listeners to the state. It defines a listener
 * as a combination of event name, tool / component name (GirafeHTMLElement.name) and if it's listening exclusively.
 */
export interface GgUserInteractionListener {
  eventName: GgUserInteractionEvent;
  isExclusive: boolean;
  toolName: string;
}

/**
 * Manages user interactions (mouse and keyboard events) by registering and unregistering listeners with the state.
 * The manager provides proper handling of user interaction events by reassigning events to the active tool,
 * providing logic for exclusive listeners, and reverting back to defaults when tools are closed.
 */
class UserInteractionManager extends GirafeSingleton {
  private readonly state = StateManager.getInstance().state;

  private get listenersInState() {
    return this.state.userInteractionListeners;
  }

  /**
   * Registers a listener for the specified interaction event. If the listener is exclusive,
   * it removes pre-existing exclusive listeners for the same event before registering the new one.
   * Ensures that duplicate listeners are not registered.
   *
   * @param {GgUserInteractionEvent} eventName - The event name to register the listener for.
   * @param {boolean} isExclusive - Indicates whether the listener is exclusive to the event.
   *                                Exclusive listeners override other listeners for the same event.
   * @param {string} toolName - The name of the tool registering the listener.
   * @return {boolean} Returns true if the listener was successfully registered, false if the listener
   *                   was already registered.
   */
  registerListener(eventName: GgUserInteractionEvent, isExclusive: boolean, toolName: string): boolean {
    if (this.isListenerRegistered(eventName, toolName)) {
      // Prevent registering if the listener already exists
      return false;
    }

    if (isExclusive) {
      // Remove any pre-existing exclusive listener for the same event (last-one-wins strategy)
      this.getExclusiveListenersForEvent(eventName, toolName).forEach((l) =>
        this.unregisterListener(l.eventName, l.toolName)
      );
    }
    this.listenersInState.push({
      eventName: eventName,
      isExclusive: isExclusive,
      toolName: toolName
    });

    return true;
  }

  /**
   * Unregisters a listener for a specific interaction event and tool by removing it from the state.
   *
   * @param {GgUserInteractionEvent} eventName - The name of the interaction event to unregister.
   * @param {string} toolName - The name of the tool associated with the event listener to be unregistered.
   * @return {void}
   */
  unregisterListener(eventName: GgUserInteractionEvent, toolName: string): void {
    const index = this.listenersInState.findIndex((l) => l.eventName === eventName && l.toolName === toolName);
    if (index > -1) {
      this.state.userInteractionListeners.splice(index, 1);
    }
  }

  /**
   * Unregisters all listeners associated with a specific tool.
   *
   * @param {string} toolName - The name of the tool for which all event listeners should be unregistered.
   * @return {void}
   */
  unregisterAllListenersOfTool(toolName: string): void {
    this.listenersInState
      .filter((l) => l.toolName === toolName)
      .forEach((l) => this.unregisterListener(l.eventName, l.toolName));
  }

  /**
   * Determines whether a listener associated with a specific event and tool can execute.
   *
   * @param {GgUserInteractionEvent} eventName - The name of the interaction event.
   * @param {string} toolName - The name of the tool associated with the event.
   * @return {boolean} Returns true if the listener can execute; otherwise, returns false.
   */
  canListenerExecute(eventName: GgUserInteractionEvent, toolName: string): boolean {
    if (!this.isListenerRegistered(eventName, toolName)) {
      return false;
    }
    // Prevent if there is an exclusive listener that is not the current tool
    if (this.getExclusiveListenersForEvent(eventName, toolName).length > 0) {
      return false;
    }
    // Else, allow execution
    return true;
  }

  /**
   * Determines whether a given tool has already registered the event in the state.
   *
   * @param {GgUserInteractionEvent} eventName - The name of the event to be checked.
   * @param {string} toolName - The name of the tool that wants to register an event.
   * @return {boolean} Returns true if the GgInteractionListener is already registered.
   */
  private isListenerRegistered(eventName: GgUserInteractionEvent, toolName: string): boolean {
    return this.listenersInState.find((l) => l.eventName === eventName && l.toolName === toolName) !== undefined;
  }

  private getDependentEvents(eventName: GgUserInteractionEvent): GgUserInteractionEvent[] {
    return [...(gGEventDependencies[eventName] ?? []), eventName];
  }

  /**
   * Checks whether the specified event is dependent on another event by checking the gGEventDependencies list.
   */
  private isEventDependentOn(eventName: GgUserInteractionEvent, eventNameToTest: GgUserInteractionEvent): boolean {
    return this.getDependentEvents(eventName).includes(eventNameToTest);
  }

  /**
   * Retrieves the exclusive listeners for a specific event, omitting the specified toolName. To request all
   * exclusive listeners of that event, omit the toolName parameter.
   *
   * @param {GgUserInteractionEvent} eventName - The name of the interaction event to filter listeners by.
   * @param {string} toolName - The name of the tool to exclude listeners associated with (optional).
   * @return {GgUserInteractionListener[]} An array of exclusive listeners matching the specified event and tool exclusion criteria.
   */
  private getExclusiveListenersForEvent(
    eventName: GgUserInteractionEvent,
    toolName?: string
  ): GgUserInteractionListener[] {
    return this.listenersInState.filter(
      (l) => this.isEventDependentOn(l.eventName, eventName) && l.isExclusive && l.toolName !== (toolName ?? undefined)
    );
  }
}

export default UserInteractionManager;
