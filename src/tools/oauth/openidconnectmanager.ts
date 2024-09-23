import * as oauth from 'oauth4webapi';

import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';
import { BasicLoginStatus } from './utils';
import GirafeSingleton from '../../base/GirafeSingleton';
import ShareManager from '../share/sharemanager';

export type IssuerTransformationAlgorithm = 'oauth2' | 'oidc';

export type OauthIssuerStatus =
  | BasicLoginStatus
  | 'loggingIn.redirected'
  | 'loggingIn.gettingToken'
  | 'loggedIn.refreshingTokens';

export type OauthIssuerState = {
  status: OauthIssuerStatus;
  nonce?: string;
  codeVerifier?: string;
  openIdTokens?: oauth.OpenIDTokenEndpointResponse;
  claims?: oauth.IDToken;
  userInfo?: oauth.UserInfoResponse;
  openIdTokensTimestamp?: number;
};

const EXPECT_NO_NONCE = 'expectNoNonce';

export class OpenIdConnectManager extends GirafeSingleton {
  configManager: ConfigManager;
  stateManager: StateManager;

  issuerUrl: URL;
  algorithm: IssuerTransformationAlgorithm;
  scope: string;
  clientId: string;
  codeChallengeMethod: string;
  configurationPromise?: Promise<boolean>;

  tokensAutoRefreshTimer?: NodeJS.Timeout;
  tokensRefreshCallbacks: Array<() => any> = [];
  handlingIssuerRedirectPromise?: Promise<string>;
  #authorizationServer?: Promise<oauth.AuthorizationServer>;

  constructor(type: string) {
    super(type);
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();

    this.issuerUrl = new URL('https://awaiting.config.load');
    this.algorithm = 'oidc';
    this.scope = 'awaiting config load';
    this.clientId = 'awaiting config load';
    this.codeChallengeMethod = 'awaiting config load';
  }

  get state() {
    return this.stateManager.state;
  }

  get status(): OauthIssuerStatus {
    return this.state.oauth.issuer.status;
  }

  /** Code verifier for Authorization Code Grant with Proof Key for Code Exchange (PKCE) */
  get codeVerifier(): string {
    if (!this.state.oauth.issuer.codeVerifier) {
      this.state.oauth.issuer.codeVerifier = oauth.generateRandomCodeVerifier();
    }
    return this.state.oauth.issuer.codeVerifier;
  }
  set codeVerifier(value: string | undefined) {
    this.state.oauth.issuer.codeVerifier = value;
  }

  /** nonce: only used if Authorization Code Grant with Proof Key for Code Exchange (PKCE) is not available
   * untested.
   */
  get nonce(): string {
    if (!this.state.oauth.issuer.nonce) {
      this.state.oauth.issuer.nonce = oauth.generateRandomNonce();
    }
    return this.state.oauth.issuer.nonce;
  }
  set nonce(value: string | undefined) {
    this.state.oauth.issuer.nonce = value;
  }

  /** access token provided by the issuer */
  get claims(): oauth.IDToken | undefined {
    return this.state.oauth.issuer.claims;
  }

  /** access token provided by the issuer */
  get openIdTokens(): oauth.OpenIDTokenEndpointResponse | undefined {
    return this.state.oauth.issuer.openIdTokens;
  }

  /** access token provided by the issuer */
  get accessToken(): string | undefined {
    return this.state.oauth.issuer.openIdTokens?.access_token;
  }

  /** Whether Oauth has a configuration
   *
   * used to:
   * 1) test if we have oauth in general
   * 2) in the OpenIdConnectManager, throw exception if trying to call oauth functions when unconfigured
   */
  async configured(throwException = false) {
    if (this.configurationPromise === undefined) {
      this.configurationPromise = this.configManager.loadConfig().then(() => {
        if (!this.configManager.Config.oauth?.issuer.url || !this.configManager.Config.oauth?.issuer.clientId) {
          return false;
        }
        this.issuerUrl = new URL(this.configManager.Config.oauth.issuer.url);
        this.algorithm = this.configManager.Config.oauth.issuer.algorithm as IssuerTransformationAlgorithm;
        this.scope = this.configManager.Config.oauth.issuer.scope ?? 'openid';
        this.clientId = this.configManager.Config.oauth.issuer.clientId;
        this.codeChallengeMethod = this.configManager.Config.oauth.issuer.codeChallengeMethod ?? 'S256';
        return true;
      });
    }

    const configured = await this.configurationPromise;
    if (!configured && throwException) {
      throw new Error('OAuth: missing configuration for OpenID Connect issuer.');
    }
    return configured;
  }

  /** login method to be called by UI */
  async login() {
    this.reset(true, 'unlogged');
    await this.redirectToIssuerLogin();
  }

  async logout(backchannel = false) {
    if (backchannel) {
      await this.backchannelLogoutFromIssuer();
    } else {
      await this.logoutFromIssuer();
    }
  }

  /** Checks whether logged in to issuer using redirection
   *
   * Redirects to issuer login page with prompt=none URL param.
   * If logged in, will be redirected back with auth URL params.
   * If not, will get back error=login_required URL param.
   */
  checkSession() {
    return this.redirectToIssuerLogin(true);
  }

  /** Check the issuer session in the background using an iframe
   *
   * requires a state.oauth.issuer.claims.session_state, resolves with three possible outcomes:
   * - unchanged: session_state has not changed
   * - changed: session_state has changed
   * - error: session_state has not changed
   *
   * if session_state has a value and is unchanged: it means we are logged in
   * */
  async backchannelCheckSession() {
    // TODO DD: proper issuer session check, not possible as background check in an iframe not available from mapbs
    // TODO DD: send message to iframe to actually do the check
    // should post a msg to iframe with data clientId and sessionState together, separated by a single space
    await this.configured(true);

    if (!this.state.oauth.issuer.claims?.session_state) {
      // TODO DD: return proper value
      return Promise.reject(new Error('NO SESSION STATE: not logged in'));
    }

    const authorizationServer = await this.getAuthorizationServer();

    if (!authorizationServer.check_session_iframe) {
      return Promise.reject(new Error('OAuth: authorization server does not support session check.'));
    }

    const checkSessionPromise = new Promise((resolve) => {
      window.addEventListener('message', (event) => {
        console.info('OpenIdConnectManager.checkIssuerSession() RECEIVED MESSAGE:', event);
        if (event.origin == authorizationServer.check_session_iframe) {
          console.info('TODO: handle check session message from iframe');
          // TODO DD: handle actual data
          if (event.data === 'unchanged' || event.data === 'changed') {
            resolve(event.data);
          } else {
            resolve('error');
          }
        }
      });
    });

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', authorizationServer.check_session_iframe);
    iframe.style.width = '640px';
    iframe.style.height = '480px';
    iframe.addEventListener('load', () => {
      if (!iframe.contentWindow) {
        throw new Error('iframe has no content window.');
      }
      iframe.contentWindow.postMessage(this.clientId + ' ' + this.state.oauth.issuer.claims?.session_state);
    });

    document.body.appendChild(iframe);

    return checkSessionPromise;
  }

  /** Rest the login state and userInfos to original states */
  reset(alsoUserInfo = true, finalStatus: OauthIssuerStatus = 'unknown') {
    this.codeVerifier = undefined;
    this.nonce = undefined;
    if (alsoUserInfo) {
      this.state.oauth.issuer.userInfo = undefined;
    }
    this.state.oauth.issuer.openIdTokens = undefined;
    this.state.oauth.issuer.openIdTokensTimestamp = undefined;
    this.state.oauth.issuer.claims = undefined;
    this.state.oauth.issuer.status = finalStatus;
  }

  /** Detects whether we just have been redirected to geogirafe from the issuer login page.
   * i.e. this.state.oauth.issuer.status === 'loggingIn.redirected' or "loginStatusCheck"
   * If so finishes the login process in the background.
   * If not, does nothing.
   */
  async resumeLoginAfterIssuerRedirect() {
    await this.configured(true);

    if (!this.isStatusRedirected()) {
      return false;
    }

    return this.handleLoggedInToIssuer();
  }

  async getAuthorizationServer(): Promise<oauth.AuthorizationServer> {
    await this.configured(true);
    if (!this.#authorizationServer) {
      this.#authorizationServer = oauth
        .discoveryRequest(this.issuerUrl, { algorithm: this.algorithm })
        .then((response) => oauth.processDiscoveryResponse(this.issuerUrl, response));

      this.#authorizationServer.catch((error) => {
        const msg = 'OAuth authentication server ' + this.issuerUrl + ' could not be initialized.';
        console.error(msg + ' Error:', error);
        this.#authorizationServer = undefined;
        throw new Error(msg);
      });
    }
    return this.#authorizationServer;
  }

  /** Redirects the current page to the oauth issuer login page, telling it to redirect back to current page upon login. */
  async redirectToIssuerLogin(loginStatusCheck: boolean = false) {
    console.log('Redirecting to issuer login');

    await this.configured(true);

    // End of prerequisites

    const authorizationServer = await this.getAuthorizationServer();

    if (!authorizationServer.authorization_endpoint) {
      throw new Error(`No authorization endpoint found for oauth issuer  ${this.issuerUrl}.`);
    }

    /**
     * The following MUST be generated for every redirect to the authorization_endpoint. You must store
     * the codeVerifier and nonce in the end-user session such that it can be recovered as the user
     * gets redirected from the authorization server back to your application.
     */
    this.codeVerifier = oauth.generateRandomCodeVerifier();
    const code_challenge = await oauth.calculatePKCECodeChallenge(this.codeVerifier);

    // redirect user to authorizationServer.authorization_endpoint
    const authorizationUrl = new URL(authorizationServer.authorization_endpoint);
    authorizationUrl.searchParams.set('client_id', this.clientId);
    authorizationUrl.searchParams.set('redirect_uri', this.getRedirectUrl());
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', this.scope);
    authorizationUrl.searchParams.set('code_challenge', code_challenge);
    authorizationUrl.searchParams.set('code_challenge_method', this.codeChallengeMethod);
    if (loginStatusCheck) {
      // if logged in, issuer redirects with auth URL params
      // if not logged in, issuer redirect with URL parameter ?error=login_required instead of prompting the user for login
      authorizationUrl.searchParams.set('prompt', 'none');
    }

    /**
     * We cannot be sure the authorization server supports PKCE so we're going to use nonce too. Use of PKCE is
     * backwards compatible even if the authorization server doesn't support it which is why we're using it regardless.
     */
    if (authorizationServer.code_challenge_methods_supported?.includes(this.codeChallengeMethod) !== true) {
      this.nonce = oauth.generateRandomNonce();
      authorizationUrl.searchParams.set('nonce', this.nonce);
    } else {
      this.nonce = EXPECT_NO_NONCE;
    }

    // now redirect the user to authorizationUrl.href
    this.state.oauth.issuer.status = loginStatusCheck ? 'loginStatusCheck' : 'loggingIn.redirected';
    window.open(authorizationUrl, '_self'); //, '_blank');
  }

  getIssuerClient(): oauth.Client {
    return {
      client_id: this.clientId,
      token_endpoint_auth_method: 'none'
    };
  }

  isStatusRedirected() {
    return (
      this.state.oauth.issuer.status === 'loginStatusCheck' || this.state.oauth.issuer.status === 'loggingIn.redirected'
    );
  }

  /** Finishes the issuer login and obtains the access token.
   *
   * Takes the URL parameters the issuer gives after redirecting to geogirafe and uses them to get the access token.
   */
  async handleLoggedInToIssuer() {
    // TODO DD: handle login failure
    // TODO DD: break down: 1 method for 1 possible failure point
    console.log('Handling login to issuer');

    await this.configured(true);

    const handleLoggedInToIssuer = async () => {
      if (!this.isStatusRedirected()) {
        const msg =
          'OAuth sequence out of order: Trying to get issuer access tokens when not logged in to issuer. Log in to issuer first.';
        throw new Error(msg);
      }

      this.state.oauth.issuer.status = 'loggingIn.gettingToken';

      const client = this.getIssuerClient();
      const authorizationServer = await this.getAuthorizationServer();

      const currentUrl = new URL(document.URL);

      if (currentUrl.searchParams.get('error') === 'login_required') {
        // removing oauth URL parameters
        window.history.replaceState({ handleLoggedInToIssuer: 'done' }, '', window.location.pathname);
        this.state.oauth.issuer.status = 'unlogged';
        return this.state.oauth.issuer.status;
      }

      let params = undefined;
      try {
        params = oauth.validateAuthResponse(authorizationServer, client, currentUrl);
      } catch (e) {
        const errorMsg =
          'Oauth login aborted: did not receive authentication parameters after issuer redirect (probably due to user coming back without logging in at the issuer). ';
        console.error(errorMsg, 'Full error stack:', e);
        // An error here will happen if user redirects to issuer but does not login there and then comes back
        // to geogirafe.  Since this is an error a user can easily create in a normal workflow,
        // we give a simple clear error message instead of full stack.
        throw new Error('Login aborted.');
      }
      if (oauth.isOAuth2Error(params)) {
        this.state.oauth.issuer.status = 'loginFailed';
        const errorMsg = 'OAuth: Issuer login response validation failed';
        console.error(errorMsg, 'parameters:', params);
        throw new Error(errorMsg); // Handle OAuth 2.0 redirect error
      }

      const codeGrantResponse = await oauth.authorizationCodeGrantRequest(
        authorizationServer,
        client,
        params,
        this.getRedirectUrl(),
        this.codeVerifier
      );
      this.codeVerifier = undefined;

      const challenges = oauth.parseWwwAuthenticateChallenges(codeGrantResponse);
      if (challenges) {
        for (const challenge of challenges) {
          console.error('WWW-Authenticate Challenge', challenge);
        }
        this.state.oauth.issuer.status = 'loginFailed';
        throw new Error('OAuth: unknown WWW-Authenticate Challenge.');
      }

      const openIdTokens = await oauth.processAuthorizationCodeOpenIDResponse(
        authorizationServer,
        client,
        codeGrantResponse,
        this.nonce === EXPECT_NO_NONCE ? oauth.expectNoNonce : this.nonce
      );
      if (this.nonce !== EXPECT_NO_NONCE) {
        this.nonce = undefined;
      }
      if (oauth.isOAuth2Error(openIdTokens)) {
        this.state.oauth.issuer.status = 'loginFailed';
        const errorMsg = 'OAuth: Processing authorization code failed';
        console.error(errorMsg, ', auth code:', openIdTokens);
        throw new Error(errorMsg); // Handle OAuth 2.0 response body error
      } else {
        this.state.oauth.issuer.openIdTokens = openIdTokens;
        this.state.oauth.issuer.openIdTokensTimestamp = openIdTokens ? +new Date() : undefined;
      }

      console.log('Access Token Response', openIdTokens);
      this.state.oauth.issuer.claims = oauth.getValidatedIdTokenClaims(openIdTokens);
      console.log('ID Token Claims', this.state.oauth.issuer.claims);

      if (!this.accessToken) {
        this.state.oauth.issuer.status = 'loginFailed';
        throw new Error('OAuth: Logged in to issuer but no access token received.');
      }

      // removing oauth URL parameters
      window.history.replaceState({ handleLoggedInToIssuer: 'done' }, '', window.location.pathname);

      this.state.oauth.issuer.status = 'loggedIn';
      return this.state.oauth.issuer.status;
    };

    // ensure we handle the issuer redirect only once
    if (!this.handlingIssuerRedirectPromise) {
      this.handlingIssuerRedirectPromise = handleLoggedInToIssuer();

      this.handlingIssuerRedirectPromise.catch((error) => {
        this.handlingIssuerRedirectPromise = undefined;
        throw new Error(error);
      });
    }
    return this.handlingIssuerRedirectPromise;
  }

  private getRedirectUrl() {
    const state = ShareManager.getInstance().getStateToShare();
    return `${window.location.protocol}//${window.location.host}${window.location.pathname}#${state}`;
  }

  async getUserInfo() {
    await this.configured(true);

    if (!this.accessToken || !this.state.oauth.issuer.claims?.sub) {
      throw new Error('Oauth: trying to get user info from issuer without access token or claims.');
    }

    const client = this.getIssuerClient();
    const authorizationServer = await this.getAuthorizationServer();

    // UserInfo Request
    const userInfoResponse = await oauth.userInfoRequest(authorizationServer, client, this.accessToken);

    const challenges = oauth.parseWwwAuthenticateChallenges(userInfoResponse);
    if (challenges) {
      for (const challenge of challenges) {
        console.error('WWW-Authenticate Challenge', challenge);
      }
      throw new Error('OAuth: unknown WWW-Authenticate Challenge.');
    }

    this.state.oauth.issuer.userInfo = await oauth.processUserInfoResponse(
      authorizationServer,
      client,
      this.state.oauth.issuer.claims.sub,
      userInfoResponse
    );
    console.log('Issuer User Info', this.state.oauth.issuer.userInfo);
    return this.state.oauth.issuer.userInfo;
  }

  async refreshTokens() {
    await this.configured(true);
    // Refresh Token Grant Request & Response
    if (!this.openIdTokens?.refresh_token) {
      throw new Error('Oauth: trying to refresh access token from issuer without a refresh token.');
    }
    this.state.oauth.issuer.status = 'loggedIn.refreshingTokens';

    const client = this.getIssuerClient();
    const authorizationServer = await this.getAuthorizationServer();

    const response = await oauth.refreshTokenGrantRequest(authorizationServer, client, this.openIdTokens.refresh_token);

    const challenges = oauth.parseWwwAuthenticateChallenges(response);
    if (challenges) {
      for (const challenge of challenges) {
        console.error('WWW-Authenticate Challenge', challenge);
      }
      throw new Error('OAuth: unknown WWW-Authenticate Challenge.');
    }

    const newOpenIdTokens = await oauth.processRefreshTokenResponse(authorizationServer, client, response);
    if (oauth.isOAuth2Error(newOpenIdTokens)) {
      console.error('Error Response', newOpenIdTokens);
      throw new Error('OAuth: error refreshing issuer access token');
    }
    this.state.oauth.issuer.openIdTokens = newOpenIdTokens as oauth.OpenIDTokenEndpointResponse;
    this.state.oauth.issuer.openIdTokensTimestamp = newOpenIdTokens ? +new Date() : undefined;
    this.state.oauth.issuer.status = 'loggedIn';

    for (const callback of this.tokensRefreshCallbacks) {
      callback();
    }

    return newOpenIdTokens;
  }

  /** Adds a callback to be called upon when refreshing issuer tokens
   *
   * used to refresh geomapfish/keycloak session
   */
  addRefreshCallback(callback: () => any) {
    this.tokensRefreshCallbacks.push(callback);
  }

  removeRefreshCallback(callback: () => any) {
    this.tokensRefreshCallbacks = this.tokensRefreshCallbacks.filter((c) => c !== callback);
  }

  accessTokenExpiresAt() {
    if (!this.openIdTokens?.expires_in || !this.state.oauth.issuer?.openIdTokensTimestamp) {
      throw new Error('Oauth: trying to get access token duration without an access token.');
    }
    const openIdTokensExpiresAt = this.state.oauth.issuer.openIdTokensTimestamp + this.openIdTokens.expires_in * 1000;
    return openIdTokensExpiresAt;
  }

  accessTokenExpiresIn() {
    const now = +new Date();
    return this.accessTokenExpiresAt() - now;
  }

  refreshTokenExpiresAt() {
    if (!this.openIdTokens?.refresh_expires_in || !this.state.oauth.issuer?.openIdTokensTimestamp) {
      throw new Error('Oauth: trying to get refresh token duration without a refresh token.');
    }
    const refreshTokensExpiresAt =
      this.state.oauth.issuer.openIdTokensTimestamp + (this.openIdTokens.refresh_expires_in as number) * 1000;
    return refreshTokensExpiresAt;
  }

  refreshTokenExpiresIn() {
    const now = +new Date();
    return this.refreshTokenExpiresAt() - now;
  }

  /** Setup auto refresh issuer tokens, expects refresh token to still be valid
   *
   * Also ensure we login back to geomapfish on every timeout
   */
  setupAutoRefreshTokens(refreshExpirationAdvance = 30) {
    const refreshTokenAfterTimeout = () => {
      if (!this.openIdTokens?.refresh_token || !this.openIdTokens?.refresh_expires_in) {
        throw new Error('Oauth: trying to refresh access token from issuer without a refresh token.');
      }
      const accessTokenExpiresIn = this.accessTokenExpiresIn();
      const refreshTokenExpiresIn = this.refreshTokenExpiresIn();

      if (refreshTokenExpiresIn < 0) {
        console.warn(
          'Oauth autorefresh tokens: refresh token expired, resetting states, refreshTokenExpiresIn:',
          refreshTokenExpiresIn
        );
        this.reset(false);
        return;
      }

      const refreshIn = Math.max(0, accessTokenExpiresIn - refreshExpirationAdvance * 1000);
      console.log('Oauth: next tokens refresh at ', new Date(+new Date() + refreshIn));

      this.tokensAutoRefreshTimer = setTimeout(async () => {
        if (this.state.oauth.issuer.status === 'loggedIn' && this.openIdTokens?.refresh_token) {
          console.log('Oauth: autorefreshing tokens at ', new Date());
          await this.refreshTokens();
          refreshTokenAfterTimeout();
        } else {
          console.log('Oauth: autorefreshing tokens cancelled as no longer logged in.');
        }
      }, refreshIn);
    };
    if (this.tokensAutoRefreshTimer) {
      this.cancelAutoRefreshTokens();
    }
    refreshTokenAfterTimeout();
  }

  cancelAutoRefreshTokens() {
    if (this.tokensAutoRefreshTimer) {
      clearTimeout(this.tokensAutoRefreshTimer);
      this.tokensAutoRefreshTimer = undefined;
    }
  }
  /** Check access token validity and refreshes it if needed.
   * To be used on page load.
   * 3 possible cases:
   * - access token valid and refresh token valid
   * - access token expired and refresh token valid
   * - both expired
   */
  async checkTokens(): Promise<'notLoggedIn' | 'loggedIn' | 'refreshingTokens' | 'expiredTokens'> {
    if (this.state.oauth.issuer.status !== 'loggedIn') {
      return Promise.resolve('notLoggedIn');
    } else if (
      this.openIdTokens?.access_token &&
      this.openIdTokens?.expires_in &&
      this.openIdTokens?.refresh_token &&
      this.openIdTokens?.refresh_expires_in
    ) {
      // issuer loggedIn: check tokens validity
      console.info('OidcManager.resumeOauth() loggedIn, checking tokens validity');
      const accessTokenValid = this.accessTokenExpiresIn() > 0;
      const refreshTokenValid = this.refreshTokenExpiresIn() > 0;

      let loggedInResolution: 'loggedIn' | 'refreshingTokens' | 'expiredTokens';

      if (accessTokenValid && refreshTokenValid) {
        // both token valid: nothing to do
        console.info('OidcManager.resumeOauth() loggedIn, both tokens valid');
        loggedInResolution = 'loggedIn';
      } else if (!accessTokenValid && refreshTokenValid) {
        // access token expired and refresh token valid: refresh tokens
        console.info(
          'OidcManager.resumeOauth() loggedIn, access token expired and refresh token valid, refreshing tokens'
        );
        await this.refreshTokens();
        loggedInResolution = 'refreshingTokens';
      } else if (!accessTokenValid && !refreshTokenValid) {
        // both tokens expired: update state to unknown
        console.info('OidcManager.resumeOauth() loggedIn, both tokens expired, resetting states');
        this.reset(false);
        return Promise.resolve('expiredTokens');
      } else {
        throw new Error('OAuth: access token valid and refresh token expired: impossible');
      }
      return Promise.resolve(loggedInResolution);
    } else {
      throw new Error('Oauth: logged in to issuer but no tokens found.');
    }
  }

  async logoutFromIssuer(target = '_self') {
    await this.configured(true);
    if (this.state.oauth.issuer.status !== 'loggedIn' || !this.accessToken) {
      console.warn('Trying to logout from issuer when not logged in. Ignoring.');
      return;
    }

    const authorizationServer = await this.getAuthorizationServer();
    const issuerLogoutUrl = new URL(authorizationServer.end_session_endpoint!);
    issuerLogoutUrl.searchParams.set('client_id', this.clientId);
    issuerLogoutUrl.searchParams.set('post_logout_redirect_uri', window.location.href);
    //issuerLogoutUrl.searchParams.set('id_token_hint', this.accessToken);

    // note: we cannot ensure the user actually logs out on the issuer page. set status to loggedOut anyway.
    this.reset(false, 'loggedOut');
    const logoutWindow = window.open(issuerLogoutUrl, target);
    logoutWindow?.focus();
  }

  /** Logout from issuer without redirecting to issuer webpage */
  async backchannelLogoutFromIssuer() {
    await this.configured(true);

    const authorizationServer = await this.getAuthorizationServer();

    if (this.state.oauth.issuer.status !== 'loggedIn') {
      console.warn('Trying to logout from issuer when not logged in. Ignoring.');
      return;
    }
    if (!authorizationServer.backchannel_logout_supported) {
      throw new Error('Background logout not support for oauth issuer  ' + this.issuerUrl + '.');
    }
    if (!authorizationServer.backchannel_authentication_endpoint) {
      throw new Error('No logout endpoint found for oauth issuer  ' + this.issuerUrl + '.');
    }
    if (!this.claims) {
      throw new Error('Error logging out from issuer ' + this.issuerUrl + ': claims missing.');
    }
    if (!this.claims.sid) {
      throw new Error('Error logging out from issuer ' + this.issuerUrl + ': session id missing in claims.');
    }
    if (!this.claims.jti) {
      throw new Error('Error logging out from issuer ' + this.issuerUrl + ': JSON web token ID missing in claims.');
    }
    const logoutData = new URLSearchParams();
    logoutData.append('iss', this.claims.iss);
    logoutData.append('aud', Array.isArray(this.claims.aud) ? this.claims.aud.join(',') : this.claims.aud);
    logoutData.append('iat', `${this.claims.iat}`);
    logoutData.append('exp', `${this.claims.exp}`);
    logoutData.append('jti', this.claims.jti);
    logoutData.append('events', '{"http://schemas.openid.net/event/backchannel-logout":{}}');
    if (authorizationServer.backchannel_logout_session_supported) {
      logoutData.append('sid', `${this.claims.sid}`);
    }

    let logoutResponse;
    try {
      logoutResponse = await fetch(authorizationServer.backchannel_authentication_endpoint, {
        method: 'POST',
        credentials: 'include',
        body: logoutData
      });
      if (!logoutResponse.ok) {
        throw new Error(logoutResponse.statusText);
      }
      this.reset(false, 'loggedOut');
    } catch (error) {
      const errorMsg = 'Issuer logout failed: ' + error;
      console.error(errorMsg, 'logoutResponse:', logoutResponse);
      this.reset(false, 'logoutFailed');
      throw errorMsg;
    }
    return logoutResponse;
  }
}

export default OpenIdConnectManager;
