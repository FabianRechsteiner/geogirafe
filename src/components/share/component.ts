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
  styleUrl = './style.css';

  loading = true;

  shareLink?: string;
  qrCode?: string;
  twitterLogo: string = TwitterLogo;
  facebookLogo: string = FacebookLogo;
  linkedInLogo: string = LinkedInLogo;
  mailLogo: string = MailLogo;

  shareManager: ShareManager;
  urlShortener?: IUrlShortener;

  constructor() {
    super('share');

    this.shareManager = ShareManager.getInstance();
  }

  registerEvents() {
    this.stateManager.subscribe('interface.shareVisible', (_oldValue: boolean, newValue: boolean) =>
      this.togglePopup(newValue)
    );
  }

  initializeShortenerService() {
    // Initialize UrlShortener
    switch (this.configManager.Config.share.service) {
      case 'gmf':
        this.urlShortener = new GmfManager();
        break;
      case 'lstu':
        this.urlShortener = new LstuManager(this.configManager.Config.share.createUrl);
        break;
    }
  }

  render() {
    super.render();
    super.makeDraggable();
  }

  async togglePopup(visible: boolean) {
    if (this.urlShortener && visible) {
      this.loading = true;
      this.render();
      const base = window.location.href.split('#')[0];
      const hash = this.shareManager.getStateToShare();
      const longurl = `${base}#${hash}`;

      const response = await this.urlShortener.shortenUrl(longurl);
      this.shareLink = response.shorturl;
      this.qrCode = response.qrcode;
      this.loading = false;
      this.render();
    } else {
      this.renderEmpty();
    }
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

  copyToClipboard() {
    navigator.clipboard.writeText(this.shareLink!);
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.girafeTranslate();
      this.initializeShortenerService();
      this.registerEvents();
    });
  }
}

export default ShareComponent;
