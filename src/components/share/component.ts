import GirafeDraggableElement from '../../base/GirafeDraggableElement';
import TwitterLogo from './images/twitter.svg';
import FacebookLogo from './images/facebook.svg';
import LinkedInLogo from './images/linkedin.svg';
import MailLogo from './images/mail.svg';
import ShareManager from '../../tools/share/sharemanager';
import { IUrlShortener } from './tools/iurlshortener';
import LstuManager from './tools/lstumanager';
import GmfManager from './tools/gmfmanager';

class ShareComponent extends GirafeDraggableElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  loading = true;
  shareLink?: string;
  qrCode?: string;
  success: boolean = true;
  twitterLogo: string = TwitterLogo;
  facebookLogo: string = FacebookLogo;
  linkedInLogo: string = LinkedInLogo;
  mailLogo: string = MailLogo;

  shareManager: ShareManager;
  urlShortener?: IUrlShortener;

  currentTab = 'share-map';
  iframeUrl?: string;
  iframeCode?: string;

  iframeSize: 'small' | 'medium' | 'large' = 'small';
  public get iframeWidth() {
    switch (this.iframeSize) {
      case 'small':
        return 400;
      case 'medium':
        return 600;
      case 'large':
        return 800;
      default:
        throw new Error('Unknown iframe size');
    }
  }

  public get iframeHeight() {
    switch (this.iframeSize) {
      case 'small':
        return 300;
      case 'medium':
        return 450;
      case 'large':
        return 600;
      default:
        throw new Error('Unknown iframe size');
    }
  }

  constructor() {
    super('share');

    this.shareManager = ShareManager.getInstance();
  }

  registerEvents() {
    this.subscribe('interface.shareVisible', (_oldValue: boolean, newValue: boolean) => this.togglePopup(newValue));
  }

  initializeShortenerService() {
    // Initialize UrlShortener
    switch (this.configManager.Config.share.service) {
      case 'gmf':
        this.urlShortener = new GmfManager(this.configManager.Config.share.createUrl);
        break;
      case 'lstu':
        this.urlShortener = new LstuManager(this.configManager.Config.share.createUrl);
        break;
    }
  }

  render() {
    super.render();
    super.makeDraggable();
    this.girafeTranslate();
  }

  async togglePopup(visible: boolean) {
    if (this.urlShortener && visible) {
      this.loading = true;
      this.render();

      const currentUrl = new URL(window.location.href);
      const baseUrl = `${currentUrl.protocol}//${currentUrl.host}${currentUrl.pathname}`;
      const hash = this.shareManager.getStateToShare();

      // Get short URL
      const longurl = `${baseUrl}#${hash}`;
      let response = await this.urlShortener.shortenUrl(longurl);
      this.shareLink = response.shorturl;
      this.success = response.success;
      this.qrCode = response.qrcode;

      // Get short URL for iframe
      const longIframeUrl = `${baseUrl}iframe.html#${hash}`;
      response = await this.urlShortener.shortenUrl(longIframeUrl);
      this.iframeUrl = response.shorturl;
      this.setIframeCode();

      this.loading = false;
      this.refreshRender();
    } else {
      this.renderEmpty();
    }
  }

  setIframeCode() {
    this.iframeCode = `<iframe title="iframe MapBS" src="${this.iframeUrl}" width="${this.iframeWidth}" height="${this.iframeHeight}"></iframe>`;
  }

  closeWindow() {
    this.state.interface.shareVisible = false;
  }

  shareFacebook() {
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + this.shareLink, '_blank');
  }

  shareTwitter() {
    window.open('https://twitter.com/intent/tweet?url=' + this.shareLink, '_blank');
  }

  shareLinkedIn() {
    window.open('https://www.linkedin.com/shareArticle?url=' + this.shareLink, '_blank');
  }

  shareMail() {
    const subject = encodeURIComponent('Check out this link');
    const body = encodeURIComponent('I thought you might be interested in this link: ' + this.shareLink);
    window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
  }

  activateTab(tabName: string) {
    this.currentTab = tabName;
    this.refreshRender();
  }

  copyToClipboard(type: 'short' | 'iframe') {
    let textToCopy = '';

    if (type === 'short') {
      textToCopy = this.shareLink ?? '';
    } else if (type === 'iframe') {
      textToCopy = this.iframeCode ?? '';
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
    }
  }

  onSizeChanged(event: Event) {
    this.iframeSize = (event.target as HTMLInputElement)?.value as 'small' | 'medium' | 'large';
    this.setIframeCode();
    this.refreshRender();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.initializeShortenerService();
      this.registerEvents();
    });
  }
}

export default ShareComponent;
