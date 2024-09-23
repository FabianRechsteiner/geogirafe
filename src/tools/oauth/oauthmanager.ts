import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import { AbstractOauthManager } from './abstractoauthmanager';
import KeycloakManager, { OauthGeomapfishState } from './keycloakmanager';
import OpenIdConnectManager, { OauthIssuerState } from './openidconnectmanager';
import { BasicLoginStatus } from './utils';
import OauthStatePersistenceManager from './oauthstatepersistencemanager';

export type OauthStatus = BasicLoginStatus | 'issuer.loggedIn' | 'geomapfish.loggedIn' | 'loggingIn' | 'loggingOut';

export type OauthState = {
  status: OauthStatus;
  issuer: OauthIssuerState;
  geomapfish: OauthGeomapfishState;
};

export class OauthManager extends AbstractOauthManager {
  configManager: ConfigManager;
  stateManager: StateManager;
  issuerManager: OpenIdConnectManager;
  geomapfishManager: KeycloakManager;

  resumePromise?: Promise<string>;

  constructor() {
    super('OauthManager');
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.issuerManager = OpenIdConnectManager.getInstance();
    this.geomapfishManager = KeycloakManager.getInstance();

    const refreshGeomapfishSession = () => this.geomapfishManager.login();
    this.addRefreshCallback(refreshGeomapfishSession);

    OauthStatePersistenceManager.getInstance();

    // @ts-expect-error
    window.oauthManager = this;
  }

  get state() {
    return this.stateManager.state;
  }

  get status(): OauthStatus {
    return this.state.oauth.status;
  }

  /** Whether Oauth has a configuration
   *
   * used to:
   * 1) test if we have oauth in general (if oauthManager.configured() returns false, geogirafe UI should not display any login/oauth options)
   * 2) in the OpenIdConnectManager, throw exception if trying to call oauth functions when unconfigured
   */
  async configured(throwException = false) {
    const config = await this.configManager.loadConfig();
    const hasOauthConfig = config.oauth !== undefined;
    if (throwException && !hasOauthConfig) {
      throw new Error('No OAuth configuration found');
    }
    return hasOauthConfig;
  }

  /** Rest the login state and userInfos to original states */
  reset(
    alsoUserInfo = true,
    finalIssuerStatus: BasicLoginStatus = 'unlogged',
    finalGeomapfishStatus: BasicLoginStatus = 'unlogged'
  ) {
    this.issuerManager.reset(alsoUserInfo, finalIssuerStatus);
    this.geomapfishManager.reset(alsoUserInfo, finalGeomapfishStatus);
  }

  /** login method to be called by UI */
  async login() {
    this.reset(true);
    this.issuerManager.login();
  }

  async logout(backchannel = false) {
    await this.geomapfishManager.logout();
    this.issuerManager.logout(backchannel);
  }

  checkSession() {
    return this.issuerManager.checkSession();
  }

  /** Ensures we finish the login process before loading themes */
  async readyToLoadThemes() {
    if (!(await this.configured())) {
      return 'no-oauth';
    }
    return await this.resumeOauth().catch((e) => {
      console.error('Oauth.readyToLoadThemes() Error resuming Oauth: ready anyway without oauth. Error:', e);
      return 'resumeOauthFailure';
    });
  }

  /** Resume OAuth state after page load, taking the proper action
   *
   * possible cases to handle:
   * 1) unlogged: nothing to do
   * 2) unknown: check session (if config to do so)
   * 3) loggingIn.redirected from issuer: finish login process
   * 4) logged in: check tokens validity
   * 5) intermediate states: loggingIn/out, login/logoutFailed, set to unknown
   */
  async resumeOauth() {
    if (this.resumePromise) {
      return this.resumePromise;
    }
    await this.configured(true);

    let startingStatus: string;
    let checkSession: boolean = false;
    if (this.state.oauth.status === 'unknown') {
      //unknown status: check session
      checkSession = true;
      startingStatus = 'unknown';
    } else if (this.state.oauth.status === 'unlogged' || this.state.oauth.status === 'loggedOut') {
      // unlogged: nothing to do
      console.info('OauthManager.resumeOauth() unlogged, nothing to do');
      startingStatus = this.state.oauth.status;
    } else if (this.issuerManager.isStatusRedirected()) {
      // issuer redirected: resume login
      startingStatus = this.state.oauth.issuer.status;
      console.info('OauthManager.resumeOauth() loggingIn.redirected, resuming login');
      await this.resumeLoginAfterIssuerRedirect();
    } else if (this.state.oauth.issuer.status === 'loggedIn') {
      // loggedIn to issuer: check tokens and refresh if needed (geomapfish login taken care of with refreshCallback)
      startingStatus = await this.issuerManager.checkTokens();
      // if checkTokens establishes that we're not logged in, check the session!
      checkSession = startingStatus === 'expiredTokens';
    } else {
      // other states? console.warn and set state to unlogged
      console.warn('OAuth in intermediate states, resetting states to unlogged. Current states:');
      console.warn('\t- oauth.status:', this.state.oauth.status);
      console.warn('\t- oauth.issuer.status:', this.state.oauth.issuer.status);
      console.warn('\t- oauth.geomapfish.status:', this.state.oauth.geomapfish.status);
      checkSession = true;
      this.reset(false, 'unknown', 'unknown');
      startingStatus = 'intermediateStates';
    }

    // if needed: check session
    if (checkSession && this.configManager.Config.oauth?.issuer.checkSessionOnLoad) {
      this.checkSession();
    }
    // if we end up logged in: auto-refresh tokens when needed
    if (this.state.oauth.issuer.status === 'loggedIn') {
      this.issuerManager.setupAutoRefreshTokens();
    }
    return Promise.resolve(startingStatus);
  }

  /** Detects whether we just have been redirected to geogirafe from the issuer login page.
   * i.e. this.state.oauth.issuer.status === 'loggingIn.redirected'
   * If so finishes the login process in the background.
   * If not, does nothing.
   */
  async resumeLoginAfterIssuerRedirect() {
    await this.configured(true);

    const loggedInAfterIssuerRedirect = await this.issuerManager.resumeLoginAfterIssuerRedirect();
    if (loggedInAfterIssuerRedirect === 'loggedIn') {
      const issuerUserInfoPromise = this.issuerManager.getUserInfo();
      const geomapfishPromise = this.geomapfishManager.login().then(async () => this.geomapfishManager.getUserInfo());
      await Promise.all([issuerUserInfoPromise, geomapfishPromise]);
    }
    return loggedInAfterIssuerRedirect;
  }

  addRefreshCallback(callback: () => any) {
    this.issuerManager.addRefreshCallback(callback);
  }

  removeRefreshCallback(callback: () => any) {
    this.issuerManager.removeRefreshCallback(callback);
  }
}

export default OauthManager;
