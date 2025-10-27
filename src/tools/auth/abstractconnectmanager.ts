import IGirafeContext from '../context/icontext';

export default abstract class AbstractConnectManager {
  private readonly storagePath = 'oAuth';

  protected readonly context;
  constructor(context: IGirafeContext) {
    this.context = context;
  }

  protected get state() {
    return this.context.stateManager.state;
  }

  public abstract initialize(): Promise<void>;
  public abstract login(): Promise<void>;
  public abstract silentLogin(): Promise<void>;
  public abstract logout(): Promise<void>;

  protected loggedOutFromBackend() {
    this.context.errorManager.pushMessage(
      'You were logged out',
      'Your identity is not recognized any more by the backend. Please try to login again, or contact an administrator.',
      'warning'
    );
    this.loggedOut();
  }

  public handleErrorFromIssuer() {
    this.context.errorManager.pushMessage('Login Failed', this.state.oauth.error ?? 'Unknown error', 'error');
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
    let url;
    if (silent) {
      url = new URL(this.context.urlManager.getRootUrl());
      url.pathname += 'silentlogincallback.html';
    } else {
      url = new URL(this.context.urlManager.getBaseUrlPath());
    }

    url.searchParams.append('authentified', 'true');
    url.hash = this.context.urlManager.getHash() ?? '';
    return url.toString();
  }

  protected getLogoutRedirectUrl() {
    const url = new URL(this.context.urlManager.getBaseUrlPath());
    url.searchParams.append('authentified', 'false');
    url.hash = this.context.urlManager.getHash() ?? '';
    return url.toString();
  }

  protected loadFromLocalStorage(path: string): unknown {
    return this.context.userDataManager.getUserData(`${this.storagePath}.${path}`, true) ?? '';
  }

  protected saveToLocalStorage(path: string, value: string) {
    return this.context.userDataManager.saveUserData(`${this.storagePath}.${path}`, value, true);
  }

  protected resetUrl() {
    const url = new URL(this.context.urlManager.getBaseUrlPath());
    url.hash = this.context.urlManager.getHash() ?? '';
    this.context.urlManager.updateUrl(url);
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
