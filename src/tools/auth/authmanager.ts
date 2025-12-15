import OpenIdConnectManager from './openidconnectmanager';
import GirafeSingleton from '../../base/GirafeSingleton';
import AbstractConnectManager from './abstractconnectmanager';
import GMFConnectManager from './gmfconnectmanager';
import ServiceWorkerHelper from '../utils/swhelper';
import IGirafeContext from '../context/icontext';
import GMFManager from './gmfmanager';

export default class AuthManager extends GirafeSingleton {
  private serviceWorkerHelper!: ServiceWorkerHelper;
  private issuerManager!: AbstractConnectManager;
  private readonly gmfManager;

  private get state() {
    return this.context.stateManager.state;
  }

  public constructor(context: IGirafeContext) {
    super(context);
    this.gmfManager = new GMFManager(this.context);
  }

  public override initializeSingleton() {
    this.context.stateManager.subscribe('oauth.status', () => this.loginStateChanged());
    this.context.stateManager.subscribe('oauth.tokens', () => this.tokensChanged());
  }

  public async initialize(sw: ServiceWorker | null) {
    if (!sw) {
      console.warn("ServiceWorker cannot be initialized. Authentication won't work properly.");
      return;
    }
    this.serviceWorkerHelper = new ServiceWorkerHelper(sw);

    const oauthIssuerConfig = this.context.configManager.Config.oauth?.issuer;
    const gmfauthConfig = this.context.configManager.Config.gmfauth;

    if (oauthIssuerConfig) {
      // Standard oAuth workflow
      await this.initializeOAuth(oauthIssuerConfig);
    } else if (gmfauthConfig) {
      await this.initializeGmfAuth(gmfauthConfig);
    } else {
      // No auth configured
      this.state.application.isAuthInitialized = true;
    }
  }

  private async initializeOAuth(config: any) {
    await this.serviceWorkerHelper.sendMessageToServiceWorker({ clear_access_token: true });
    this.issuerManager = new OpenIdConnectManager(this.context);
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
    this.issuerManager = new GMFConnectManager(this.context, this.gmfManager);
    await this.issuerManager.initialize();
    // For GMF, the silent login is actually the same as checkin if the userinfos are already defined
    if (config.checkSessionOnLoad) {
      await this.silentLogin();
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
        const previousUsername = this.state.oauth.userInfo?.username;
        await this.gmfManager.getUserInfo();
        if (this.state.oauth.userInfo?.username) {
          // TODO REG : At the moment we just test if the username has changed,
          // but actually we should test if some of the rights have changed
          this.state.oauth.somethingChanged = this.state.oauth.userInfo.username !== previousUsername;
          this.state.oauth.status = 'loggedIn';
        } else {
          this.state.oauth.error = 'No user found in the token';
          this.state.oauth.status = 'loginFailed';
        }
      } else if (this.state.oauth.status === 'loggedIn' || this.state.oauth.status === 'loggedOut') {
        this.issuerManager.finalizeLoginWorkflow();
      } else if (this.state.oauth.status === 'loginFailed') {
        this.issuerManager.handleErrorFromIssuer();
      }
    } catch (error) {
      this.issuerManager.handleUnknownError(error as Error);
      throw error;
    }
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
