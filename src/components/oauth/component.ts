import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import OauthManager from '../../tools/oauth/oauthmanager';

export class OauthComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../styles/common.css'];

  public userIconUrl?: string;

  oauthManager: OauthManager;
  public menuOpen: boolean = false;

  constructor() {
    super('oauth');
    console.info('OauthComponent constructor');
    this.oauthManager = OauthManager.getInstance();
  }

  private registerEvents() {
    this.subscribe('oauth.status', () => this.refreshRender());
    this.subscribe(/oauth\.userInfo.*/, () => this.refreshRender());
  }

  async refreshRender() {
    this.userIconUrl = await this.getUserIconUrl();
    super.refreshRender();
  }

  public onLoginClick() {
    if (!this.configManager.Config.oauth) {
      throw new Error('Authentication is not configured on this instance. Login cannot be done.');
    } else {
      this.oauthManager.login();
    }
  }

  public onLogoutClick() {
    if (window.confirm('Do you want to logout ?')) {
      this.oauthManager.logout();
    }
  }

  public async getUserIconUrl() {
    if (this.state.oauth.userInfo?.email) {
      const hashedEmail = await this.sha256(this.state.oauth.userInfo.email);
      const gravatarUrl = `https://www.gravatar.com/avatar/${hashedEmail}?d=mp`;
      return gravatarUrl;
    }
    return undefined;
  }

  private async sha256(message: string) {
    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(message);
    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // convert bytes to hex string
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
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
