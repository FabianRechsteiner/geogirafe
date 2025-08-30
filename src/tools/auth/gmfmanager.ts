import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import GirafeSingleton from '../../base/GirafeSingleton';

export default class GMFManager extends GirafeSingleton {
  private readonly configManager: ConfigManager;
  private readonly stateManager: StateManager;

  private get isOAuth() {
    return this.configManager.Config.oauth !== undefined;
  }

  constructor(type: string) {
    super(type);
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
  }

  get state() {
    return this.stateManager.state;
  }

  get gmfConfigForOAuth() {
    return this.configManager.Config.oauth!.geomapfish;
  }

  get gmfConfigForGmfAuth() {
    return this.configManager.Config.gmfauth!;
  }

  public async loginWithToken() {
    // NOTE: With the new OICD Worflow that has been integrated in GMF 2.9, this is not needed any more.
    // But for OICD integration before 2.9, this is still needed (This is for the moment specific to workflow at BS)
    // TOOD REG : Remove this code when MapBS will be migrated to the standard GMF flow
    if (this.gmfConfigForOAuth.loginUrl) {
      console.debug('Auth: 2.1. Backend login with token');
      if (!this.isOAuth) {
        throw new Error('Login with JWT token if the issuer does not support oAuth is not supported.');
      }

      const gmfLoginResponse = await fetch(this.gmfConfigForOAuth.loginUrl, {
        headers: {
          Authorization: `Bearer ${this.state.oauth.tokens?.access_token}`
        }
      });
      if (!gmfLoginResponse.ok) {
        throw new Error(gmfLoginResponse.statusText);
      }
    }

    this.state.oauth.status = 'loggedIn';
  }

  public async logout() {
    console.debug('Auth: 4. Backend logout');
    let logoutUrl = null;
    if (this.isOAuth && this.gmfConfigForOAuth.logoutUrl) {
      // OIDC but Logout from Backend (case for BS)
      logoutUrl = this.gmfConfigForOAuth.logoutUrl;
    } else if (!this.isOAuth) {
      // GMF-Auth
      logoutUrl = `${this.gmfConfigForGmfAuth.url}logout`;
    }

    // If logoutUrl is not set, it means we do not need to logout from backend.
    // The token will be removed when loging out from the OIDC provider.
    if (logoutUrl) {
      const gmfLogoutResponse = await fetch(logoutUrl);
      if (!gmfLogoutResponse.ok) {
        throw new Error(gmfLogoutResponse.statusText);
      }
    }
    this.state.oauth.userInfo = undefined;
    this.state.oauth.status = 'backend.loggedOut';
  }

  public async getUserInfo() {
    console.debug('Auth: 3. Get UserInfo');
    const userInfoUrl = this.isOAuth ? this.gmfConfigForOAuth.userInfoUrl : `${this.gmfConfigForGmfAuth.url}loginuser`;
    this.state.oauth.userInfo = await fetch(userInfoUrl).then((r) => r.json());
  }
}
