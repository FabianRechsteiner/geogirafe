import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import GirafeSingleton from '../../base/GirafeSingleton';

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
  configManager: ConfigManager;
  stateManager: StateManager;

  constructor(type: string) {
    super(type);
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
  }

  get state() {
    return this.stateManager.state;
  }

  get gmfConfig() {
    return this.configManager.Config.oauth!.geomapfish;
  }

  public async login() {
    const gmfLoginResponse = await fetch(this.gmfConfig.loginUrl, {
      headers: { Authorization: `Bearer ${this.state.oauth.tokens!.access_token}` },
      credentials: 'include'
    });
    if (!gmfLoginResponse.ok) {
      throw new Error(gmfLoginResponse.statusText);
    }

    this.state.oauth.status = 'loggedIn';
  }

  public async logout() {
    const gmfLogoutResponse = await fetch(this.gmfConfig.logoutUrl, { credentials: 'include' });
    if (!gmfLogoutResponse.ok) {
      throw new Error(gmfLogoutResponse.statusText);
    }
    this.state.oauth.status = 'loggedOut';
  }

  public async getUserInfo() {
    this.state.oauth.userInfo = await fetch(this.gmfConfig.userInfoUrl, { credentials: 'include' }).then((r) =>
      r.json()
    );
    this.state.oauth.status = 'loggedIn';
  }
}
