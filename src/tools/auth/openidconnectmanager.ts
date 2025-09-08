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
import UserDataManager from '../userdata/userdatamanager';
import UrlManager from '../url/urlmanager';

export default class OpenIdConnectManager extends AbstractConnectManager {
  private authorizationServer?: AuthorizationServer;
  private readonly storagePath = 'oAuth';
  private silentLoginIframe?: HTMLIFrameElement;

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

  public override async initialize() {
    window.addEventListener('message', async (event) => {
      if (event.origin !== window.location.origin) {
        // potentially dangerous message (unknown origin)
        return;
      }
      await this.handleSilentLoggedInViaIframe(event);
    });

    if (this.isAuthentified()) {
      if (!this.hasAuthError()) {
        // We are back from issuer authentication.
        // Go to the next step with the backend authentication
        await this.handleLoggedInToIssuer();
      } else {
        // We are back but with an error.
        this.resetUrlHistory(false);
        this.handleErrorFromIssuer();
      }
    }
  }

  /**
   * Code verifier for Authorization Code Grant with Proof Key for Code Exchange (PKCE)
   * It has to be the same when coming back from the issuer after a redirect
   * Therefore, we keep it in localStorage.
   */
  get codeVerifier(): string {
    return this.loadFromLocalStorage('codeVerifier') as string;
  }

  set codeVerifier(value: string) {
    this.saveToLocalStorage('codeVerifier', value);
  }

  /**
   * The RedirectUrl has to be the same for all call to the issuer
   * Because the authentication is given for a specific redirectUrl.
   * Therefore, we keep it in localStorage.
   */
  get redirectUrl() {
    return this.loadFromLocalStorage('redirectUrl') as string;
  }

  set redirectUrl(value: string) {
    this.saveToLocalStorage('redirectUrl', value);
  }

  /**
   * The currentState cannot just be passed as parameter in the URL
   * Because the URL-length is limited.
   * Therefore, we keep it in localStorage.
   */
  get currentState() {
    return this.loadFromLocalStorage('currentState') as string;
  }

  set currentState(value: string) {
    if (value.startsWith('#')) {
      value = value.substring(1);
    }
    this.saveToLocalStorage('currentState', value);
  }

  private loadFromLocalStorage(path: string): unknown {
    return UserDataManager.getInstance().getUserData(`${this.storagePath}.${path}`, true) ?? '';
  }

  private saveToLocalStorage(path: string, value: string) {
    return UserDataManager.getInstance().saveUserData(`${this.storagePath}.${path}`, value, true);
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

  private async getAuthorizationUrl(silent: boolean) {
    const authorizationServer = await this.getAuthorizationServer();
    if (!authorizationServer.authorization_endpoint) {
      throw new Error(`No authorization endpoint found for oauth issuer  ${this.issuerConfig.url}.`);
    }

    // Use Code-Verifier and Code-Challenge
    this.codeVerifier = generateRandomCodeVerifier();
    const code_challenge = await calculatePKCECodeChallenge(this.codeVerifier);

    // Save the current state of the application before login
    // If we are in an autologin case, we use the state from the URL
    // Otherwise we use the current state of the application
    this.currentState = silent ? window.location.hash : ShareManager.getInstance().getStateToShare();

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
      authorizationUrl.searchParams.set('prompt', 'none');
    }

    return authorizationUrl;
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
      await this.redirectToIssuerLogin();
    }
  }

  public override async silentLogin() {
    /**
     * If autologin configuration is activated, we force a loggin at the start of the app
     * But if we are coming back from the issuer, we are already in a loggin process.
     * In this case we do not do anything
     */
    if (!this.authProcessed()) {
      await this.silentLoginViaIframe();
    }
  }

  public override async logout() {
    console.debug('Auth: 5. Issuer logout');
    await this.logoutFromIssuer();
  }

  private getLoginRedirectUrl(silent: boolean) {
    if (silent) {
      return `${UrlManager.getInstance().getBaseUrl()}silentlogincallback.html?authentified=true`;
    }
    return `${UrlManager.getInstance().getBaseUrl()}?authentified=true`;
  }

  private getLogoutRedirectUrl() {
    return `${UrlManager.getInstance().getBaseUrl()}`;
  }

  private async silentLoginViaIframe() {
    const authorizationUrl = await this.getAuthorizationUrl(true);
    this.silentLoginIframe = document.createElement('iframe');
    this.silentLoginIframe.style.display = 'none';
    this.silentLoginIframe.src = authorizationUrl.toString();
    document.body.appendChild(this.silentLoginIframe);
  }

  private async handleSilentLoggedInViaIframe(event: MessageEvent<any>) {
    if (event.data?.type === 'OAUTH_CALLBACK') {
      const params = new URLSearchParams(event.data.data);
      const newUrl = new URL(window.location.href);
      for (const [key, value] of params.entries()) {
        newUrl.searchParams.set(key, value);
      }
      UrlManager.getInstance().updateUrl(newUrl);
      await this.handleLoggedInToIssuer();
    } else if (event.data?.type === 'OAUTH_ERROR') {
      console.info('Silent login could not be done : ', event.data.error);
      this.state.application.isAuthInitialized = true;
    }

    if (this.silentLoginIframe) {
      document.body.removeChild(this.silentLoginIframe);
      this.silentLoginIframe = undefined;
    }
  }

  private async redirectToIssuerLogin() {
    const authorizationUrl = await this.getAuthorizationUrl(false);
    window.open(authorizationUrl, '_self');
  }

  private async handleLoggedInToIssuer() {
    console.debug('Auth: 2. Issuer login handle');
    const authorizationServer = await this.getAuthorizationServer();
    const client = this.getClient();
    const currentUrl = new URL(document.URL);

    try {
      const params = validateAuthResponse(authorizationServer, client, currentUrl);
      const response = await authorizationCodeGrantRequest(
        authorizationServer,
        client,
        TlsClientAuth(),
        params,
        this.redirectUrl,
        this.codeVerifier
      );

      const openIdTokens = await processAuthorizationCodeResponse(authorizationServer, client, response);
      this.setToken(openIdTokens);
      this.state.oauth.audience = this.issuerConfig.audience;
      // Remove oauth URL parameters
      this.resetUrlHistory(true);
    } catch (error) {
      this.manageError(error as Error);
    }
  }

  private setToken(tokens: TokenEndpointResponse) {
    this.state.oauth.tokens = tokens;
    // Prepare refresh token
    if (this.state.oauth.tokens.expires_in) {
      const expiresInMs = this.state.oauth.tokens.expires_in * 1000;
      setTimeout(() => this.refreshToken(), expiresInMs);
    }
    this.state.oauth.status = 'issuer.loggedIn';
  }

  private resetUrlHistory(authentified: boolean) {
    let newUrl;
    if (authentified) {
      newUrl = `${UrlManager.getInstance().getBaseUrl()}#${this.currentState}`;
    } else {
      newUrl = `${UrlManager.getInstance().getBaseUrl()}?authentified=${authentified}#${this.currentState}`;
    }
    UrlManager.getInstance().updateUrl(newUrl);
  }

  private async refreshToken() {
    if (!this.state.oauth.tokens?.refresh_token) {
      throw new Error('Token cannot be refreshed : there is no refresh-token');
    }

    console.debug('Refreshing token');
    const authorizationServer = await this.getAuthorizationServer();
    const client = this.getClient();

    let openIdTokens;
    try {
      const response = await refreshTokenGrantRequest(
        authorizationServer,
        client,
        TlsClientAuth(),
        this.state.oauth.tokens.refresh_token
      );

      openIdTokens = await processRefreshTokenResponse(authorizationServer, client, response);
    } catch (error) {
      // an error here means the user was logged out somehow somewhere else.
      const errorMsg = `OAuth: Refresh token failed: ${(error as Error).message}`;
      console.error(errorMsg);
      this.resetUrlHistory(false);
      this.loggedOutFromBackend();
    }

    if (openIdTokens) {
      this.setToken(openIdTokens);
    }
  }

  private manageError(error: Error) {
    this.state.oauth.status = 'loginFailed';
    const errorMsg = `OAuth: Issuer login failed: ${error.message}`;
    console.error(errorMsg);
    this.resetUrlHistory(false);
    this.handleErrorFromIssuer();
  }

  async logoutFromIssuer() {
    // Save the current state of the application before logout
    this.currentState = ShareManager.getInstance().getStateToShare();

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
