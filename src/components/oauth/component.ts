import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import AbstractOauthManager from '../../tools/oauth/abstractoauthmanager';
import OauthManager from '../../tools/oauth/oauthmanager';

export class OauthComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  oauthManager: AbstractOauthManager;
  public configured?: boolean; // TODO REG: Move this to the state

  public menuOpen: boolean = false;

  constructor() {
    super('oauth');
    console.info('OauthComponent constructor');
    this.oauthManager = OauthManager.getInstance();

    this.renderOnConfigured();
  }

  renderOnConfigured() {
    return this.oauthManager.configured().then((configured: boolean) => {
      this.configured = configured;
      super.render();
    });
  }

  toggleOauthMenu() {
    this.menuOpen = !this.menuOpen;
    super.render();
  }

  onLoginClick(debug = false) {
    console.log('Login clicked');
    if (this.state.oauth.status !== 'loggedIn') {
      if (
        !debug ||
        window.confirm(
          'current oauth status: ' +
            this.state.oauth.status +
            '\nissuer status: ' +
            this.state.oauth.issuer.status +
            '\ngeomapfish status: ' +
            this.state.oauth.geomapfish.status +
            '\nReset oauth status and login?'
        )
      ) {
        this.oauthManager.login();
      }
    }
  }

  onLogoutClick(debug = false) {
    console.log('Logout clicked');
    if (this.state.oauth.status === 'loggedIn') {
      if (
        !debug ||
        window.confirm(
          'current oauth status: ' +
            this.state.oauth.status +
            '\nissuer status: ' +
            this.state.oauth.issuer.status +
            (this.state.oauth.issuer.userInfo ? ' (' + this.state.oauth.issuer.userInfo?.email + ')' : '') +
            '\ngeomapfish status: ' +
            this.state.oauth.geomapfish.status +
            (this.state.oauth.geomapfish.userInfo ? ' (' + this.state.oauth.geomapfish.userInfo?.username + ')' : '') +
            '\nLogout?'
        )
      ) {
        this.oauthManager.logout();
      }
    }
  }
}

export default OauthComponent;
