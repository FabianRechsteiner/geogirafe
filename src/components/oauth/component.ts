import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import AbstractOauthManager from '../../tools/oauth/abstractoauthmanager';
import OauthManager from '../../tools/oauth/oauthmanager';

export class OauthComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../styles/common.css'];

  oauthManager: AbstractOauthManager;
  public menuOpen: boolean = false;

  constructor() {
    super('oauth');
    console.info('OauthComponent constructor');
    this.oauthManager = OauthManager.getInstance();
  }

  private registerEvents() {
    this.subscribe('oauth.status', () => this.onStatusChanged());
  }

  private onStatusChanged() {
    super.refreshRender();
  }

  public onLoginClick(debug = false) {
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

  public onLogoutClick(debug = false) {
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

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      this.registerEvents();
      super.girafeTranslate();
    });
  }
}

export default OauthComponent;
