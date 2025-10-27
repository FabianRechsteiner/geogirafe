import GirafeSingleton from '../../base/GirafeSingleton';
import ISessionManager from './isessionmanager';

class SessionManager extends GirafeSingleton implements ISessionManager {
  private readonly sessionHash = 'session';

  override initializeSingleton() {
    window.addEventListener('pagehide', () => this.saveStateToSession());
  }

  public beginSession() {
    this.context.urlManager.updateHash(this.sessionHash);
  }

  public saveStateToSession() {
    console.debug('Saving state to sessionStorage');
    const serializedState = this.context.stateSerializer.getSerializedState();
    sessionStorage.setItem('geogirafe-state', serializedState);
  }

  public hasState() {
    if (this.context.urlManager.hasHash(this.sessionHash)) {
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
      stateRestored = this.context.stateSerializer.deserializeAndSetState(serializedState);
    }
    return stateRestored;
  }
}

export default SessionManager;
