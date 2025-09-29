import AbstractConnectManager from './abstractconnectmanager';
import GMFManager from './gmfmanager';

/**
 * For diverse reasons, this could NOT be done using the oAuth2 mechanisms of GMF:
 * 1. There is no .well-know discovery endpoint
 * 2. The token endpoint needs a client_secret, and for security reasons it has to be called from the backend itself.
 *    There is not custom backend for GeoGirafe and we cannot do this.
 * 3. The redirect url is limited to exact matches, and we cannot pass the state of the application in the redirect_uri
 * 4. Using GMF oAuth2 routes for authentification does not authenticate the user to the backend.
 *    It just tells the client that you have a correct user in GMF.
 *    But you do not get any valid cookie for the GMF Backend.
 *
 * For all those reasons, we cannot use the geomapfish oAuth process
 * Instead we will use the login.html page of the backend to delegate the login to the backend
 * This will be a standard GMF login, there is no oAuth Process here.
 *
 * NOTE: If the geogirafe client is not running on the same domain as the GMF backend,
 * the GMF Backend needs to be configured with :
 * - CORS with credentials for specific domain (this can be done for example with an lua script at the in the haproxy configuration)
 * - The frontend domain has to be allowed as referer in the vars.yaml file.
 * - The variable AUTHTKT_SAMESITE has to be set to None, to allow authentication cookies to be sent to the backend from another domain
 * There is no need for any oAuth2 configuration in the admin tool.
 */
export default class GMFConnectManager extends AbstractConnectManager {
  private get authConfig() {
    return this.configManager.Config.gmfauth!;
  }

  private isAuthentified() {
    return new URL(window.location.href).searchParams.get('authentified') === 'true';
  }

  public override async initialize() {
    if (this.isAuthentified()) {
      // We are back from GMF authentication.
      // Go to the next step with the backend authentication
      await this.handleLoggedInToIssuer();
    }
  }

  public override async login() {
    console.debug('Auth: 1. Issuer login');
    this.redirectToIssuerLogin();
  }

  public override async silentLogin() {
    await GMFManager.getInstance().getUserInfo();
    this.state.oauth.status = this.state.oauth.userInfo?.username ? 'loggedIn' : 'loggedOut';
  }

  public override async logout() {
    // Nothing more to do here, just mark as loggedOut
    this.sessionManager.saveStateToSession();
    console.debug('Auth: 5. Issuer logout');
    this.state.oauth.status = 'loggedOut';
  }

  private redirectToIssuerLogin() {
    this.sessionManager.saveStateToSession();
    this.redirectUrl = this.getLoginRedirectUrl(false);
    const authorizationUrl = new URL(`${this.authConfig.url}login.html`);
    authorizationUrl.searchParams.set('came_from', this.redirectUrl);
    window.open(authorizationUrl, '_self');
  }

  private async handleLoggedInToIssuer() {
    console.debug('Auth: 2. Issuer login handle');
    this.state.oauth.status = 'issuer.loggedIn';
    this.state.oauth.audience = this.authConfig.audience;

    // Prepare refresh login
    await this.refreshToken();
  }

  private async refreshToken() {
    console.debug('Refreshing token');
    const userInfoUrl = `${this.authConfig.url}loginuser`;
    this.state.oauth.userInfo = await fetch(userInfoUrl).then((r) => r.json());
    if (!this.state.oauth.userInfo?.username) {
      this.loggedOutFromBackend();
    } else {
      const expiresInMs = 600000; // 10 min
      setTimeout(() => this.refreshToken(), expiresInMs);
    }
  }
}
