import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import GirafeSingleton from '../../base/GirafeSingleton';
import AuthHelper from './authhelper';

export type GMFUserInfo = {
  username: string;
  email: string;
  family_name: string;
  given_name: string;
  is_intranet: boolean;
  two_factor_enable: boolean;
  roles: Object[];
  functionalities: Object;
};

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
    console.debug('Auth: 2.1. Backend login with token');
    if (!this.isOAuth) {
      throw new Error('Login with JWT token if the issuer does not support oAuth is not supported.');
    }

    const gmfLoginResponse = await fetch(this.gmfConfigForOAuth.loginUrl, AuthHelper.getFetchOptions(true));
    if (!gmfLoginResponse.ok) {
      throw new Error(gmfLoginResponse.statusText);
    }

    this.state.oauth.status = 'loggedIn';
  }

  public async logout() {
    console.debug('Auth: 4. Backend logout');
    const logoutUrl = this.isOAuth ? this.gmfConfigForOAuth.logoutUrl : `${this.gmfConfigForGmfAuth.url}/logout`;
    const gmfLogoutResponse = await fetch(logoutUrl, AuthHelper.getFetchOptions());
    if (!gmfLogoutResponse.ok) {
      throw new Error(gmfLogoutResponse.statusText);
    }
    this.state.oauth.userInfo = undefined;
    this.state.oauth.status = 'backend.loggedOut';
  }

  public async getUserInfo() {
    console.debug('Auth: 3. Get UserInfo');
    const userInfoUrl = this.isOAuth ? this.gmfConfigForOAuth.userInfoUrl : `${this.gmfConfigForGmfAuth.url}/loginuser`;
    this.state.oauth.userInfo = await fetch(userInfoUrl, AuthHelper.getFetchOptions()).then((r) => r.json());
    if (this.state.oauth.userInfo?.username) {
      this.state.oauth.status = 'loggedIn';
    } else {
      this.state.oauth.status = 'loggedOut';
    }
  }
}
