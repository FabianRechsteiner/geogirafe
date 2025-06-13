import StateManager from '../state/statemanager';
import GMFManager from './gmfmanager';
import OpenIdConnectManager from './openidconnectmanager';
import GirafeSingleton from '../../base/GirafeSingleton';
import ConfigManager from '../configuration/configmanager';
import AbstractConnectManager from './abstractconnectmanager';
import GMFConnectManager from './gmfconnectmanager';
import { v4 as uuidv4 } from 'uuid';
import ServiceWorkerHelper from '../utils/swhelper';

export default class AuthManager extends GirafeSingleton {
  private serviceWorkerHelper!: ServiceWorkerHelper;
  private readonly stateManager: StateManager;

  private issuerManager!: AbstractConnectManager;
  private readonly gmfManager: GMFManager;

  private get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);
    this.stateManager = StateManager.getInstance();
    this.gmfManager = GMFManager.getInstance();
    this.stateManager.subscribe('oauth.status', () => this.loginStateChanged());
    this.stateManager.subscribe('oauth.tokens', () => this.tokensChanged());
  }

  public async initialize(sw: ServiceWorker | null) {
    if (!sw) {
      console.warn("ServiceWorker cannot be initialized. Authentication won't work properly.");
      return;
    }
    this.serviceWorkerHelper = new ServiceWorkerHelper(sw);

    const oauthIssuerConfig = ConfigManager.getInstance().Config.oauth?.issuer;
    const gmfauthConfig = ConfigManager.getInstance().Config.gmfauth;

    if (oauthIssuerConfig) {
      // Standard oAuth workflow
      await this.initializeOAuth(oauthIssuerConfig);
    } else if (gmfauthConfig) {
      await this.initializeGmfAuth(gmfauthConfig);
    }
    // Else: no auth configured
    // Nothing to do
  }

  private async initializeOAuth(config: any) {
    await this.serviceWorkerHelper.sendMessageToServiceWorker({ clear_access_token: true });
    this.issuerManager = OpenIdConnectManager.getInstance();
    await this.issuerManager.initialize();
    // No silent login if user is in the process of being logged in ('issuer.loggedIn' is second step of login process)
    if (config.checkSessionOnLoad && this.state.oauth.status !== 'issuer.loggedIn') {
      await this.silentLogin();
    }
    if (config.loginRequired && this.state.oauth.status === 'loggedOut') {
      await this.login();
    }
  }

  private async initializeGmfAuth(config: any) {
    this.issuerManager = GMFConnectManager.getInstance();
    await this.issuerManager.initialize();
    // For GMF, the silent login is actually the same as checkin if the userinfos are already defined
    if (config.checkSessionOnLoad) {
      await this.gmfManager.getUserInfo();
      this.state.oauth.status = this.state.oauth.userInfo?.username ? 'loggedIn' : 'loggedOut';
    }
    if (config.loginRequired && this.state.oauth.status === 'loggedOut') {
      await this.login();
    }
  }

  private async loginStateChanged() {
    // The serviceWorkerHelper is instantiated in the initialize() method and not in the constructor
    // of AuthManager. Yet this method (.loginStateChanged()) is expected to be called from the constructor
    // as a propagation of subscribing to a change of 'oauth.status' with an already non-empty status.
    // To prevent unnecessary error login in console:
    if (!this.serviceWorkerHelper) {
      return;
    }

    try {
      console.log('Login state changed:', this.state.oauth.status);
      // Notify the service worker about the login state change
      await this.serviceWorkerHelper.sendMessageToServiceWorker({ loginState: this.state.oauth.status });
      if (this.state.oauth.status === 'issuer.loggedIn') {
        // We are logged in to the identity provider
        // We must now login to GMF (for GMF < 2.9 only)
        // If we got a token from the issuer, we first call the GMF login route with Token
        if (this.state.oauth.tokens) {
          await this.gmfManager.loginWithToken();
        }
        // And then we get the UserInfos
        await this.gmfManager.getUserInfo();
        if (this.state.oauth.userInfo?.username) {
          this.state.oauth.status = 'loggedIn';
        } else {
          throw new Error('Login failed, no user found.');
        }
      } else if (this.state.oauth.status === 'loggedOutForcedFromBackend') {
        // The user was loggedout from the backend
        // This can happen either if the user has been loggedout from another tab in the browser
        // Or if the user session was closed from the identity provider
        this.userLoggedOutFromBackend();
      }
    } catch (e) {
      this.state.oauth.status = 'loginFailed';
      throw e;
    }
  }

  private userLoggedOutFromBackend() {
    this.stateManager.state.infobox.elements.push({
      id: uuidv4(),
      text: 'User has been logged out.',
      type: 'warning'
    });
  }

  private async tokensChanged() {
    await this.serviceWorkerHelper.sendMessageToServiceWorker({ access_token: this.state.oauth.tokens?.access_token });
  }

  public async login() {
    // Login to the issuer.
    // The login to the backend will automatically be done
    // when coming back from the issuer
    try {
      await this.issuerManager.login();
    } catch (e) {
      this.state.oauth.status = 'loginFailed';
      throw e;
    }
  }

  private async silentLogin() {
    try {
      console.log('silentLogin');
      await this.issuerManager.silentLogin();
    } catch {
      this.state.oauth.status = 'loggedOut';
    }
  }

  public async logout() {
    // Logout from backend and then from the issuer
    try {
      await this.gmfManager.logout();
      await this.issuerManager.logout();
    } catch (e) {
      this.state.oauth.status = 'loginFailed';
      throw e;
    }
  }
}
