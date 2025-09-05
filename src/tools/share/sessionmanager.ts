import GirafeSingleton from '../../base/GirafeSingleton';
import StateManager from '../state/statemanager';
import UrlManager from '../url/urlmanager';
import StateSerializer from './stateserializer';

class SessionManager extends GirafeSingleton {
  stateSerializer: StateSerializer;
  stateManager: StateManager;

  private readonly sessionHash = 'session';

  constructor(type: string) {
    super(type);

    this.stateSerializer = StateSerializer.getInstance();
    this.stateManager = StateManager.getInstance();

    window.addEventListener('pagehide', () => this.saveStateToSession());
  }

  public beginSession() {
    UrlManager.getInstance().updateHash(this.sessionHash);
  }

  private saveStateToSession() {
    console.debug('Saving state to sessionStorage');
    const serializedState = this.stateSerializer.getSerializedState();
    sessionStorage.setItem('geogirafe-state', serializedState);
  }

  public hasState() {
    if (UrlManager.getInstance().hasHash(this.sessionHash)) {
      const serializedState = sessionStorage.getItem('geogirafe-state');
      return serializedState !== null;
    }
    return false;
  }

  public setStateFromSession(): boolean {
    let stateRestored = false;
    const serializedState = sessionStorage.getItem('geogirafe-state');
    if (serializedState) {
      console.debug('Restoring state from sessionStorage');
      stateRestored = this.stateSerializer.deserializeAndSetState(serializedState);
    }
    return stateRestored;
  }
}

export default SessionManager;
