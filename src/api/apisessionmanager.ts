// SPDX-License-Identifier: Apache-2.0
import GirafeSingleton from '../base/GirafeSingleton';
import ISessionManager from '../tools/share/isessionmanager';

class ApiSessionManager extends GirafeSingleton implements ISessionManager {
  public override initializeSingleton() {
    /* For the API: Do Nothing */
  }

  public beginSession() {
    /* For the API: Do Nothing */
  }

  public saveStateToSession() {
    /* For the API: Do Nothing */
  }

  public hasState() {
    /* For the API: State is never stored */
    return false;
  }

  public setStateFromSession(): boolean {
    /* For the API: State is never restored */
    return false;
  }
}

export default ApiSessionManager;
