import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import GirafeSingleton from '../../base/GirafeSingleton';
import { BasicLoginStatus } from './utils';

export type OauthGeomapfishStatus = BasicLoginStatus | 'loggingIn.SendingKeycloakRequest';

export type GeomapfishUserInfo = {
  username: string;
  email: string;
  family_name: string;
  given_name: string;
  is_intranet: boolean;
  two_factor_enable: boolean;
  roles: Object[];
  functionalities: Object;
};
export type OauthGeomapfishState = {
  status: OauthGeomapfishStatus;
  userInfo?: GeomapfishUserInfo;
};

export default class KeycloakManager extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;

  userInfoUrl: string;
  loginUrl: string;
  logoutUrl: string;
  anonymousUsername?: string;
  configurationPromise?: Promise<boolean>;

  constructor() {
    super('KeycloakManager');
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.userInfoUrl = 'awaiting config load';
    this.loginUrl = 'awaiting config load';
    this.logoutUrl = 'awaiting config load';
  }

  get state() {
    return this.stateManager.state;
  }

  get status(): OauthGeomapfishStatus {
    return this.state.oauth.geomapfish.status;
  }

  /** Whether Oauth has a configuration
   *
   * used to:
   * 1) test if we have oauth in general
   * 2) throw exception if trying to call oauth functions when unconfigured
   */
  async configured(throwException = false) {
    if (!this.configurationPromise) {
      this.configurationPromise = this.configManager.loadConfig().then(() => {
        if (
          !this.configManager.Config.oauth?.geomapfish.userInfoUrl ||
          !this.configManager.Config.oauth?.geomapfish.loginUrl ||
          !this.configManager.Config.oauth?.geomapfish.logoutUrl
        ) {
          return false;
        }
        this.userInfoUrl = this.configManager.Config.oauth.geomapfish.userInfoUrl;
        this.loginUrl = this.configManager.Config.oauth.geomapfish.loginUrl;
        this.logoutUrl = this.configManager.Config.oauth.geomapfish.logoutUrl;
        this.anonymousUsername = this.configManager.Config.oauth.geomapfish.anonymousUsername;
        return true;
      });
    }

    const configured = await this.configurationPromise;
    if (!configured && throwException) {
      throw new Error('OAuth: missing configuration for Keycloak/GeoMapFish.');
    }
    return configured;
  }

  /** Rest the login state and userInfos to original states */
  reset(alsoUserInfo = true, finalStatus: OauthGeomapfishStatus = 'unlogged') {
    if (alsoUserInfo) {
      this.state.oauth.geomapfish.userInfo = undefined;
    }
    this.state.oauth.geomapfish.status = finalStatus;
  }

  /** Logins to Keycloak (and GeoMapFish) using the access token. */
  async login() {
    await this.configured(true);

    if (this.state.oauth.issuer.status !== 'loggedIn' || !this.state.oauth.issuer.openIdTokens?.access_token) {
      const msg =
        'OAuth sequence out of order: Trying to log in to GeoMapFish when not logged in to issuer. Log in to issuer first.';
      throw new Error(msg);
    }
    let gmfLoginResponse: Response;
    try {
      this.state.oauth.geomapfish.status = 'loggingIn.SendingKeycloakRequest';
      gmfLoginResponse = await fetch(this.loginUrl, {
        headers: { Authorization: `Bearer ${this.state.oauth.issuer.openIdTokens.access_token}` },
        credentials: 'include'
      });
      if (!gmfLoginResponse.ok) {
        throw new Error(gmfLoginResponse.statusText);
      }
      console.log('GeoMapFish login response status: ', gmfLoginResponse.status);
      this.state.oauth.geomapfish.status = 'loggedIn';
    } catch (error) {
      this.state.oauth.geomapfish.status = 'loginFailed';
      const errorMsg = 'GeoMapFish login failed: ' + error;
      throw new Error(errorMsg);
    }
  }

  async logout() {
    if (this.state.oauth.geomapfish.status !== 'loggedIn') {
      console.warn('Trying to logout from GeoMapFish when not logged in. Ignoring.');
      return;
    }

    let gmfLogoutResponse: Response | undefined;
    try {
      gmfLogoutResponse = await fetch(this.logoutUrl, { credentials: 'include' });
      if (!gmfLogoutResponse.ok) {
        throw new Error(gmfLogoutResponse.statusText);
      }
    } catch (error) {
      this.state.oauth.geomapfish.status = 'logoutFailed';
      const errorMsg = 'GeoMapFish logout failed: ' + error;
      console.error(errorMsg, 'gmfLogoutResponse:', gmfLogoutResponse);
      throw new Error(errorMsg);
    }
    this.reset(false, 'loggedOut');
  }

  async checkSession() {
    if (!this.anonymousUsername) {
      return undefined;
    }
    const userInfo = await this.getUserInfo(false);
    const geomapfishLoggedIn = userInfo?.username !== this.anonymousUsername;
    if (geomapfishLoggedIn) {
      this.state.oauth.geomapfish.status = 'loggedIn';
    } else {
      this.state.oauth.geomapfish.status = 'unlogged';
      this.state.oauth.geomapfish.userInfo = undefined;
    }
    return geomapfishLoggedIn;
  }

  async getUserInfo(checkStatus: boolean = true) {
    await this.configured(true);
    if (checkStatus && this.state.oauth.geomapfish.status !== 'loggedIn') {
      const msg =
        'OAuth sequence out of order: Trying to obtain geomapfish user info when not logged in to geomapfish.';
      throw new Error(msg);
    }
    this.state.oauth.geomapfish.userInfo = await fetch(this.userInfoUrl, { credentials: 'include' }).then((r) =>
      r.json()
    );
    console.log('GeoMapFish User Info', this.state.oauth.geomapfish.userInfo);
    return this.state.oauth.geomapfish.userInfo;
  }
}
