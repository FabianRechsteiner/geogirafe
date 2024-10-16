import StateManager from '../state/statemanager';
import GMFManager from './gmfmanager';
import OpenIdConnectManager from './openidconnectmanager';
import GirafeSingleton from '../../base/GirafeSingleton';
import ConfigManager from '../configuration/configmanager';
import AbstractConnectManager from './abstractconnectmanager';
import GMFConnectManager from './gmfconnectmanager';

export default class AuthManager extends GirafeSingleton {
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
  }

  public initialize() {
    const oauthIssuerConfig = ConfigManager.getInstance().Config.oauth?.issuer;
    if (oauthIssuerConfig) {
      // Standard oAuth workflow
      this.initializeOAuth(oauthIssuerConfig);
    }

    const gmfauthConfig = ConfigManager.getInstance().Config.gmfauth;
    if (gmfauthConfig) {
      this.initializeGmfAuth(gmfauthConfig);
    }

    // Else: oo auth configured
    // Nothing to do
  }

  private initializeOAuth(config: any) {
    this.issuerManager = OpenIdConnectManager.getInstance();
    this.issuerManager.initialize();
    if (config.checkSessionOnLoad) {
      this.silentLogin();
    }
    if (config.loginRequired && this.state.oauth.status === 'loggedOut') {
      this.login();
    }
  }

  private async initializeGmfAuth(config: any) {
    this.issuerManager = GMFConnectManager.getInstance();
    this.issuerManager.initialize();
    // For GMF, the silent login is actually the same as checkin if the userinfos are already defined
    if (config.checkSessionOnLoad) {
      await this.gmfManager.getUserInfo();
    }
    if (config.loginRequired && this.state.oauth.status === 'loggedOut') {
      this.login();
    }
  }

  private async loginStateChanged() {
    try {
      if (this.state.oauth.status === 'issuer.loggedIn') {
        // We are logged in to the identity provider
        // We must now login to GMF
        // If we got a token from the issuer, we first call the GMF login route with Token
        if (this.state.oauth.tokens) {
          await this.gmfManager.loginWithToken();
        }
        // And then we get the UserInfos
        await this.gmfManager.getUserInfo();
      }
    } catch (e) {
      this.state.oauth.status = 'loginFailed';
      throw e;
    }
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
      await this.issuerManager.silentLogin();
    } catch (e) {
      this.state.oauth.status = 'loggedOut';
      // TODO REG : Test anonymous username ?
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
