import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default class OauthComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  public userIconUrl?: string;

  constructor(name: string = 'oauth') {
    super(name);
  }

  private registerEvents() {
    this.subscribe('oauth.status', () => this.refreshRender());
    this.subscribe(/oauth\.userInfo.*/, () => this.refreshRender());
  }

  public getDisplayName() {
    if (this.state.oauth.userInfo?.display_name) {
      return this.state.oauth.userInfo.display_name;
    } else if (this.state.oauth.userInfo?.username) {
      return this.state.oauth.userInfo.username;
    }
    return this.state.oauth.userInfo?.email ?? 'Unknown User';
  }

  refreshRender() {
    this.getUserIconUrl().then((url) => {
      this.userIconUrl = url;
      super.refreshRender();
    });
  }

  public onLoginClick() {
    if (!this.context.configManager.Config.oauth && !this.context.configManager.Config.gmfauth) {
      throw new Error('Authentication is not configured on this instance. Login cannot be done.');
    } else {
      this.context.authManager.login();
    }
  }

  public async onLogoutClick() {
    const logout = await window.gConfirm('Do you want to logout ?', 'Logout');
    if (logout) {
      this.context.authManager.logout();
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
    super.connectedCallback();
    super.render();
    this.registerEvents();
    super.girafeTranslate();
  }
}
