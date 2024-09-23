import StateManager from '../state/statemanager';
import GirafeSingleton from '../../base/GirafeSingleton';
import { BasicLoginStatus, isUnloggedEquivalent } from './utils';
import { OauthIssuerStatus } from './openidconnectmanager';

export default class OauthStatePersistenceManager extends GirafeSingleton {
  stateManager: StateManager;
  persistentStringProperties: string[] = [
    'oauth.status',
    'oauth.issuer.status',
    'oauth.issuer.nonce',
    'oauth.issuer.openIdTokensTimestamp',
    'oauth.issuer.codeVerifier',
    'oauth.geomapfish.status'
  ];
  persistentObjProperties: string[] = [
    'oauth.issuer.openIdTokens',
    'oauth.issuer.claims',
    'oauth.issuer.userInfo',
    'oauth.geomapfish.userInfo'
  ];

  constructor() {
    super('OauthStatePersistenceManager');
    this.stateManager = StateManager.getInstance();
    this.state.oauth.status = (localStorage.getItem('oauth.status') ?? 'unknown') as BasicLoginStatus;
    this.state.oauth.issuer.status = (localStorage.getItem('oauth.issuer.status') ?? 'unknown') as OauthIssuerStatus;
    this.state.oauth.issuer.nonce = localStorage.getItem('oauth.issuer.nonce') ?? undefined;
    this.state.oauth.issuer.codeVerifier = localStorage.getItem('oauth.issuer.codeVerifier') ?? undefined;
    const openIdTokensTimestamp = localStorage.getItem('oauth.issuer.openIdTokensTimestamp');
    this.state.oauth.issuer.openIdTokensTimestamp = openIdTokensTimestamp ? +openIdTokensTimestamp : undefined;
    console.log(
      'OauthStatePersistenceManager.constructor() updating this.state.issuer.openIdTokens: ',
      this.state.oauth.issuer.openIdTokens
    );
    this.state.oauth.issuer.openIdTokens =
      JSON.parse(localStorage.getItem('oauth.issuer.openIdTokens') ?? 'null') ?? undefined;
    console.log(
      'OauthStatePersistenceManager.constructor() updated this.state.issuer.openIdTokens: ',
      this.state.oauth.issuer.openIdTokens
    );
    this.state.oauth.issuer.claims = JSON.parse(localStorage.getItem('oauth.issuer.claims') ?? 'null') ?? undefined;
    this.state.oauth.geomapfish.status = (localStorage.getItem('oauth.geomapfish.status') ??
      'unlogged') as BasicLoginStatus;
    this.state.oauth.issuer.userInfo = JSON.parse(localStorage.getItem('oauth.issuer.userInfo') ?? 'null') ?? undefined;
    this.state.oauth.geomapfish.userInfo =
      JSON.parse(localStorage.getItem('oauth.geomapfish.userInfo') ?? 'null') ?? undefined;
    this.registerEvents();
  }
  get state() {
    return this.stateManager.state;
  }

  registerEvents() {
    for (let persistentProperty of this.persistentStringProperties) {
      this.stateManager.subscribe(persistentProperty, (_oldValue, newValue: string | undefined) => {
        this.persistOauthState(persistentProperty, newValue);
        if (persistentProperty === 'oauth.issuer.status' || persistentProperty === 'oauth.geomapfish.status') {
          this.updateOauthGlobalStatus();
        }
      });
    }
    for (let persistentProperty of this.persistentObjProperties) {
      this.stateManager.subscribe(persistentProperty, (_oldValue, newValue: Object | undefined) => {
        this.persistOauthState(persistentProperty, JSON.stringify(newValue));
      });
    }
    /*this.stateManager.subscribe('oauth.issuer.openIdTokens', (_oldValue, newValue: oauth.OpenIDTokenEndpointResponse | undefined) => {
        console.log("oauth.issuer.openIdTokens CHANGED _oldValue", _oldValue, "newValue", newValue)
        this.updateIssuerTokenTimestamp(newValue);
      });*/
  }
  persistOauthState(stateProperty: string, value: string | undefined) {
    if (value !== undefined) {
      localStorage.setItem(stateProperty, value);
    } else {
      localStorage.removeItem(stateProperty);
    }
  }
  updateOauthGlobalStatus() {
    // TODO DD: do proper combinations
    /**
     * Illegal combinations:
     * - issuer not loggedIn and  geomapfish loggingIn
     */
    if (this.state.oauth.issuer.status === 'unknown') {
      this.state.oauth.status = 'unknown';
    } else if (this.state.oauth.issuer.status === 'loginStatusCheck') {
      this.state.oauth.status = 'loginStatusCheck';
    } else if (
      this.state.oauth.issuer.status.includes('loggedIn') &&
      this.state.oauth.geomapfish.status === 'loggedIn'
    ) {
      this.state.oauth.status = 'loggedIn';
    } else if (this.state.oauth.issuer.status === 'loggedOut' && this.state.oauth.geomapfish.status === 'loggedOut') {
      this.state.oauth.status = 'loggedOut';
    } else if (
      isUnloggedEquivalent(this.state.oauth.issuer.status) &&
      isUnloggedEquivalent(this.state.oauth.geomapfish.status)
    ) {
      this.state.oauth.status = 'unlogged';
    } else if (
      this.state.oauth.issuer.status === 'loginFailed' ||
      this.state.oauth.geomapfish.status === 'loginFailed'
    ) {
      this.state.oauth.status = 'loginFailed';
    } else if (
      this.state.oauth.issuer.status === 'logoutFailed' ||
      this.state.oauth.geomapfish.status === 'logoutFailed'
    ) {
      this.state.oauth.status = 'logoutFailed';
    } else if (
      this.state.oauth.issuer.status.includes('loggingIn') &&
      isUnloggedEquivalent(this.state.oauth.geomapfish.status)
    ) {
      this.state.oauth.status = 'loggingIn';
    } else if (
      this.state.oauth.issuer.status.includes('loggedIn') &&
      this.state.oauth.geomapfish.status === 'unlogged'
    ) {
      this.state.oauth.status = 'loggingIn';
    } else if (
      this.state.oauth.issuer.status.includes('loggedIn') &&
      this.state.oauth.geomapfish.status.includes('loggingIn')
    ) {
      this.state.oauth.status = 'loggingIn';
    } else if (
      this.state.oauth.issuer.status.includes('loggedIn') &&
      isUnloggedEquivalent(this.state.oauth.geomapfish.status)
    ) {
      this.state.oauth.status = 'issuer.loggedIn';
    } else if (
      isUnloggedEquivalent(this.state.oauth.issuer.status) &&
      this.state.oauth.geomapfish.status === 'loggedIn'
    ) {
      this.state.oauth.status = 'geomapfish.loggedIn';
    } else if (this.state.oauth.issuer.status === 'loggedOut' && this.state.oauth.geomapfish.status === 'unlogged') {
      this.state.oauth.status = 'loggedOut';
    } else if (
      this.state.oauth.issuer.status.includes('loggedIn') &&
      this.state.oauth.geomapfish.status === 'loggedOut'
    ) {
      this.state.oauth.status = 'loggingOut';
    } else {
      throw new Error(
        'Oauth: unexpected issuer.status and geomapfish.status combination: issuer.status=' +
          this.state.oauth.issuer.status +
          ' and geomapfish.status=' +
          this.state.oauth.geomapfish.status
      );
    }
  }
  /*updateIssuerTokenTimestamp(newOpenIdTokens: oauth.OpenIDTokenEndpointResponse | undefined) {
      console.log("updateIssuerTokenTimestamp!! openIdTokensTimestamp, newOpenIdTokens:", newOpenIdTokens)
      this.state.oauth.issuer.openIdTokensTimestamp = newOpenIdTokens? + new Date() : undefined;
    }*/
}
