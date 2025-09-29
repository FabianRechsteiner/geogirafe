import GirafeSingleton from '../../base/GirafeSingleton';
import ConfigManager from '../configuration/configmanager';
import ErrorManager from '../error/errormanager';
import SessionManager from '../share/sessionmanager';
import StateManager from '../state/statemanager';
import UrlManager from '../url/urlmanager';
import UserDataManager from '../userdata/userdatamanager';

export default abstract class AbstractConnectManager extends GirafeSingleton {
  protected readonly configManager: ConfigManager;
  protected readonly stateManager: StateManager;
  protected readonly sessionManager: SessionManager;
  protected readonly urlManager: UrlManager;
  private readonly userDataManager: UserDataManager;

  private readonly storagePath = 'oAuth';

  protected get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
    this.sessionManager = SessionManager.getInstance();
    this.urlManager = UrlManager.getInstance();
    this.userDataManager = UserDataManager.getInstance();
  }

  public abstract initialize(): Promise<void>;
  public abstract login(): Promise<void>;
  public abstract silentLogin(): Promise<void>;
  public abstract logout(): Promise<void>;

  protected loggedOutFromBackend() {
    ErrorManager.getInstance().pushMessage(
      'You were logged out',
      'Your identity is not recognized any more by the backend. Please try to login again, or contact an administrator.',
      'warning'
    );
    this.loggedOut();
  }

  public handleErrorFromIssuer() {
    ErrorManager.getInstance().pushMessage('Login Failed', this.state.oauth.error ?? 'Unknown error', 'error');
    this.loggedOut();
  }

  public handleUnknownError(error: Error) {
    this.state.oauth.error = error.message;
    this.state.oauth.status = 'loginFailed';
  }

  protected loggedOut() {
    this.state.oauth.status = 'loggedOut';
    this.state.oauth.tokens = undefined;
    this.state.oauth.userInfo = undefined;
    this.state.oauth.audience = [];
  }

  /**
   * The RedirectUrl has to be the same for all call to the issuer
   * Because the authentication is given for a specific redirectUrl.
   * Therefore, we keep it in localStorage.
   */
  protected get redirectUrl() {
    return this.loadFromLocalStorage('redirectUrl') as string;
  }

  protected set redirectUrl(value: string) {
    this.saveToLocalStorage('redirectUrl', value);
  }

  protected getLoginRedirectUrl(silent: boolean) {
    const url = new URL(this.urlManager.getBaseUrl());
    if (silent) {
      url.pathname += 'silentlogincallback.html';
    }

    url.searchParams.append('authentified', 'true');
    url.hash = this.urlManager.getHash() ?? '';
    return url.toString();
  }

  protected getLogoutRedirectUrl() {
    const url = new URL(this.urlManager.getBaseUrl());
    url.searchParams.append('authentified', 'false');
    url.hash = this.urlManager.getHash() ?? '';
    return url.toString();
  }

  protected loadFromLocalStorage(path: string): unknown {
    return this.userDataManager.getUserData(`${this.storagePath}.${path}`, true) ?? '';
  }

  protected saveToLocalStorage(path: string, value: string) {
    return this.userDataManager.saveUserData(`${this.storagePath}.${path}`, value, true);
  }

  protected resetUrl() {
    const url = new URL(this.urlManager.getBaseUrl());
    url.hash = this.urlManager.getHash() ?? '';
    this.urlManager.updateUrl(url);
  }

  public finalizeLoginWorkflow() {
    switch (this.state.oauth.status) {
      case 'loggedIn':
        this.resetUrl();
        break;
      case 'loggedOut':
        this.resetUrl();
        break;
      case 'not-initialized':
      case 'backend.loggedOut':
      case 'issuer.loggedIn':
      case 'loginFailed':
      case 'logoutFailed':
        throw new Error('We should only finalize the login workflow when the user is either loggedIn or loggedOut');

      default:
        throw new Error('Unmanaged login state');
    }

    this.state.application.isAuthInitialized = true;
  }
}
