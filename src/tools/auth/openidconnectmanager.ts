import AbstractConnectManager from './abstractconnectmanager';
import ShareManager from '../share/sharemanager';
import {
  authorizationCodeGrantRequest,
  AuthorizationServer,
  calculatePKCECodeChallenge,
  Client,
  discoveryRequest,
  generateRandomCodeVerifier,
  processAuthorizationCodeResponse,
  processDiscoveryResponse,
  processRefreshTokenResponse,
  refreshTokenGrantRequest,
  TlsClientAuth,
  TokenEndpointResponse,
  validateAuthResponse
} from 'oauth4webapi';

export default class OpenIdConnectManager extends AbstractConnectManager {
  private authorizationServer?: AuthorizationServer;

  private get issuerConfig() {
    return this.configManager.Config.oauth!.issuer;
  }

  private authProcessed() {
    return new URL(window.location.href).searchParams.has('authentified');
  }

  private isAuthentified() {
    return new URL(window.location.href).searchParams.get('authentified') === 'true';
  }

  private hasAuthError() {
    return new URL(window.location.href).searchParams.has('error');
  }

  public override initialize() {
    if (this.isAuthentified()) {
      if (!this.hasAuthError()) {
        // We are back from issuer authentication.
        // Go to the next step with the backend authentication
        this.handleLoggedInToIssuer();
      } else {
        // We are back but with an error.
        this.handleErrorFromIssuer();
      }
    }
  }

  /**
   * Code verifier for Authorization Code Grant with Proof Key for Code Exchange (PKCE)
   * It has be be the same when coming back from the issuer after a redirect
   * Therefore, we keep it in localStorage.
   */
  get codeVerifier(): string {
    return localStorage.getItem('oAuth-CodeVerifier') ?? '';
  }

  set codeVerifier(value: string) {
    localStorage.setItem('oAuth-CodeVerifier', value);
  }

  /**
   * The RedirectUrl has to be the same for all call to the issuer
   * Because the authentication is given for a specific redirectUrl.
   * Therefore, we keep it in localStorage.
   */
  get redirectUrl() {
    return localStorage.getItem('oAuth-RedirectUrl') ?? '';
  }

  set redirectUrl(value: string) {
    localStorage.setItem('oAuth-RedirectUrl', value);
  }

  private async getAuthorizationServer(): Promise<AuthorizationServer> {
    if (!this.authorizationServer) {
      const response = await discoveryRequest(new URL(this.issuerConfig.url), {
        algorithm: this.issuerConfig.algorithm
      });
      this.authorizationServer = await processDiscoveryResponse(new URL(this.issuerConfig.url), response);
    }
    return this.authorizationServer;
  }

  private getClient(): Client {
    return {
      client_id: this.issuerConfig.clientId,
      token_endpoint_auth_method: 'none'
    };
  }

  public override async login() {
    /**
     * If autologin configuration is activated, we force a loggin at the start of the app
     * But if we are coming back from the issuer, we are already in a loggin process.
     * In this case we do not do anything
     */
    if (!this.isAuthentified() || this.hasAuthError()) {
      console.debug('Auth: 1. Issuer login');
      await this.redirectToIssuerLogin(false);
    }
  }

  public override async silentLogin() {
    /**
     * If autologin configuration is activated, we force a loggin at the start of the app
     * But if we are coming back from the issuer, we are already in a loggin process.
     * In this case we do not do anything
     */
    if (!this.authProcessed()) {
      await this.redirectToIssuerLogin(true);
    }
  }

  public override async logout() {
    console.debug('Auth: 5. Issuer logout');
    await this.logoutFromIssuer();
  }

  private getLoginRedirectUrl(silent: boolean) {
    if (silent) {
      // Auto-Login on start
      // For the state, we use the one in the URL
      // If there isn't any, we just use no state
      return `${window.location.protocol}//${window.location.host}${window.location.pathname}?authentified=true${window.location.hash}`;
    }

    // Else, this is a normal login
    // We use the current state of the application
    const state = ShareManager.getInstance().getStateToShare();
    return `${window.location.protocol}//${window.location.host}${window.location.pathname}?authentified=true#${state}`;
  }

  private getLogoutRedirectUrl() {
    return `${window.location.protocol}//${window.location.host}${window.location.pathname}?authentified=false${window.location.hash}`;
  }

  private async redirectToIssuerLogin(silent: boolean) {
    const authorizationServer = await this.getAuthorizationServer();
    if (!authorizationServer.authorization_endpoint) {
      throw new Error(`No authorization endpoint found for oauth issuer  ${this.issuerConfig.url}.`);
    }

    // Use Code-Verifier and Code-Challenge
    this.codeVerifier = generateRandomCodeVerifier();
    const code_challenge = await calculatePKCECodeChallenge(this.codeVerifier);

    // Redirect user to authorizationServer.authorization_endpoint
    const authorizationUrl = new URL(authorizationServer.authorization_endpoint);
    this.redirectUrl = this.getLoginRedirectUrl(silent);
    authorizationUrl.searchParams.set('client_id', this.issuerConfig.clientId);
    authorizationUrl.searchParams.set('redirect_uri', this.redirectUrl);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', this.issuerConfig.scope);
    authorizationUrl.searchParams.set('code_challenge', code_challenge);
    authorizationUrl.searchParams.set('code_challenge_method', this.issuerConfig.codeChallengeMethod);

    if (silent) {
      // If silent login, we do not force a user.
      authorizationUrl.searchParams.set('prompt', 'none');
    }

    window.open(authorizationUrl, '_self');
  }

  private async handleLoggedInToIssuer() {
    console.debug('Auth: 2. Issuer login handle');
    const authorizationServer = await this.getAuthorizationServer();
    const client = this.getClient();
    const currentUrl = new URL(document.URL);

    let params;
    try {
      params = validateAuthResponse(authorizationServer, client, currentUrl);
    } catch (error) {
      this.manageError(error as Error);
    }

    const response = await authorizationCodeGrantRequest(
      authorizationServer,
      client,
      TlsClientAuth(),
      params as URLSearchParams,
      this.redirectUrl,
      this.codeVerifier
    );

    let openIdTokens;
    try {
      openIdTokens = await processAuthorizationCodeResponse(authorizationServer, client, response);
    } catch (error) {
      this.manageError(error as Error);
    }

    this.setToken(openIdTokens as TokenEndpointResponse);

    // Removing oauth URL parameters
    this.resetUrlHistory(true);
    this.state.oauth.status = 'issuer.loggedIn';
  }

  setToken(tokens: TokenEndpointResponse) {
    this.state.oauth.tokens = tokens;
    // Prepare refresh token
    if (this.state.oauth.tokens.expires_in) {
      const expiresInMs = this.state.oauth.tokens.expires_in * 1000;
      setTimeout(() => this.refreshToken(), expiresInMs);
    }
  }

  private handleErrorFromIssuer() {
    this.resetUrlHistory(false);
    this.state.oauth.status = 'loggedOut';
    this.state.oauth.tokens = undefined;
    this.state.oauth.userInfo = undefined;
  }

  private resetUrlHistory(authentified: boolean) {
    let newUrl;
    if (authentified) {
      newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}${window.location.hash}`;
    } else {
      newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?authentified=${authentified}${window.location.hash}`;
    }
    window.history.replaceState(null, '', newUrl);
  }

  private async refreshToken() {
    if (!this.state.oauth.tokens?.refresh_token) {
      throw new Error('Token cannot be refreshed : there is no refresh-token');
    }

    console.debug('Refreshing token');
    const authorizationServer = await this.getAuthorizationServer();
    const client = this.getClient();

    const response = await refreshTokenGrantRequest(
      authorizationServer,
      client,
      TlsClientAuth(),
      this.state.oauth.tokens.refresh_token
    );

    let openIdTokens;
    try {
      openIdTokens = await processRefreshTokenResponse(authorizationServer, client, response);
    } catch (error) {
      this.manageError(error as Error);
    }

    this.setToken(openIdTokens as TokenEndpointResponse);
  }

  private manageError(error: Error) {
    this.state.oauth.status = 'loginFailed';
    const errorMsg = `OAuth: Issuer login failed: ${error.message}`;
    console.error(errorMsg);
    throw error;
  }

  async logoutFromIssuer() {
    const authorizationServer = await this.getAuthorizationServer();
    const issuerLogoutUrl = new URL(authorizationServer.end_session_endpoint as string);
    const logoutRedirectUrl = this.getLogoutRedirectUrl();
    issuerLogoutUrl.searchParams.set('client_id', this.issuerConfig.clientId);
    issuerLogoutUrl.searchParams.set('post_logout_redirect_uri', logoutRedirectUrl);
    if (this.state.oauth.tokens?.id_token) {
      issuerLogoutUrl.searchParams.set('id_token_hint', this.state.oauth.tokens.id_token);
    }

    window.open(issuerLogoutUrl, '_self');
  }
}
