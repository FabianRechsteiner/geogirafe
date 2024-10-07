import StateManager from '../state/statemanager';
import GMFManager from './gmfmanager';
import OpenIdConnectManager from './openidconnectmanager';
import GirafeSingleton from '../../base/GirafeSingleton';
import ConfigManager from '../configuration/configmanager';

export default class OauthManager extends GirafeSingleton {
  private readonly stateManager: StateManager;

  private readonly issuerManager: OpenIdConnectManager;
  private readonly gmfManager: GMFManager;

  private get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);
    this.stateManager = StateManager.getInstance();
    this.issuerManager = OpenIdConnectManager.getInstance();
    this.issuerManager.initialize();
    this.gmfManager = GMFManager.getInstance();

    this.stateManager.subscribe('oauth.status', () => this.loginStateChanged());
  }

  public initialize() {
    const issuerConfig = ConfigManager.getInstance().Config.oauth?.issuer;
    if (issuerConfig?.loginRequired) {
      this.login();
    } else if (issuerConfig?.checkSessionOnLoad) {
      this.silentLogin();
    }
  }

  private async loginStateChanged() {
    try {
      if (this.state.oauth.status === 'issuer.loggedIn') {
        // We are logged in to the identity provider
        // We must now login to GMF
        await this.gmfManager.login();
        // And get UserInfos
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
      // TODO REG : Use anonymous mode
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
