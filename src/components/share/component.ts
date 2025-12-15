import TwitterLogo from './images/twitter.svg';
import FacebookLogo from './images/facebook.svg';
import LinkedInLogo from './images/linkedin.svg';
import MailLogo from './images/mail.svg';
import { IUrlShortener } from './tools/iurlshortener';
import GmfShareManager from './tools/gmfsharemanager';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import SimpleMaskManager from '../../tools/layers/simplemaskmanager';
import type { Callback } from '../../tools/state/statemanager';
import GeoGirafeShareManager from './tools/geogirafesharemanager';
import { ShareState } from './sharestate';
import IGirafePanel from '../../tools/state/igirafepanel';

class ShareComponent extends GirafeHTMLElement implements IGirafePanel {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  isPanelVisible = false;
  panelTitle = 'share-panel';
  panelTogglePath = 'interface.sharePanelVisible';

  shareLink?: string;
  qrCode?: string;
  success: boolean = true;
  twitterLogo: string = TwitterLogo;
  facebookLogo: string = FacebookLogo;
  linkedInLogo: string = LinkedInLogo;
  mailLogo: string = MailLogo;
  iframeUrl?: string;
  iframeCode?: string;

  private urlShortener?: IUrlShortener;
  private simpleMaskManager?: SimpleMaskManager;

  private readonly eventsCallbacks: Callback[] = [];

  private iframeSize: 'small' | 'medium' | 'large' | '' = '';

  get shareState(): ShareState {
    return this.state.extendedState.share as ShareState;
  }

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
  }

  private initializeShortenerService() {
    const share = this.context.configManager.Config.share;

    if (share) {
      switch (share.service) {
        case 'gmf':
          this.urlShortener = new GmfShareManager(share.createUrl);
          break;
        case 'geogirafe':
          this.urlShortener = new GeoGirafeShareManager(share.createUrl, this.context.urlManager);
          break;
      }
    }
  }

  render() {
    if (this.isPanelVisible) {
      this.renderComponent();
    } else {
      this.renderEmptyComponent();
    }
    super.girafeTranslate();
  }

  /**
   * Renders the component by calling the necessary methods.
   * @private
   */
  private renderComponent() {
    super.render();
    this.simpleMaskManager = new SimpleMaskManager(this.context.mapManager.getMap());
    // While the component is visible, listen for changes in the state to update the shared link
    this.registerEvents();
  }

  /**
   * Renders an empty component when it's not visible.
   * @private
   */
  private renderEmptyComponent() {
    this.simpleMaskManager?.setMaskVisibility(false);
    this.iframeSize = '';
    this.unregisterEvents();
    this.renderEmpty();
  }

  private clearLink() {
    this.shareLink = '';
    this.iframeUrl = '';
    this.iframeCode = '';
    this.qrCode = '';
    this.refreshRender();
  }

  private registerEvents() {
    this.eventsCallbacks.push(
      this.subscribe(/position.*/, () => this.clearLink()),
      this.subscribe(/layers\.layersList\..*/, () => this.clearLink()),
      this.subscribe('activeBasemap', () => this.clearLink())
    );
  }

  private unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
  }

  public async generateAndCopyLink() {
    await this.generateShareLink();
    this.copyToClipboard('short');
    this.refreshRender();
  }

  public async generateAndCopyIframeCode() {
    await this.generateIframeCode();
    this.copyToClipboard('iframe');
    this.refreshRender();
  }

  private async generateShareLink() {
    if (!this.urlShortener) {
      return;
    }

    const baseUrl = this.context.urlManager.getBaseUrlPath();
    const hash = this.context.shareManager.getStateToShare();

    // Get short URL
    const longurl = `${baseUrl}#${hash}`;
    const response = await this.urlShortener.shortenUrl(longurl);
    this.shareLink = response.shorturl;
    this.success = response.success;
    this.qrCode = response.qrcode;
  }

  private async generateIframeCode() {
    if (!this.urlShortener || !this.iframeSize) {
      return;
    }

    const baseUrl = this.context.urlManager.getRootUrl();
    const hash = this.context.shareManager.getStateToShare();

    // Get short URL for iframe
    const indexDocument = `iframe.html`;
    const longIframeUrl = `${baseUrl}${indexDocument}#${hash}`;
    const response = await this.urlShortener.shortenUrl(longIframeUrl, indexDocument);
    this.iframeUrl = response.shorturl;
    this.iframeCode = `<iframe title="iframe GeoGirafe" width="${this.iframeWidth}" height="${this.iframeHeight}" src="${this.iframeUrl}"></iframe>`;
  }

  closeWindow() {
    this.state.interface.sharePanelVisible = false;
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

  private copyToClipboard(type: 'short' | 'iframe') {
    let textToCopy = '';

    if (type === 'short') {
      textToCopy = this.shareLink ?? '';
    } else if (type === 'iframe') {
      textToCopy = this.iframeCode ?? '';
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      this.showCopySuccessEffect(`btn-copy-${type}`);
    }
  }

  public onSizeChanged(event: Event) {
    this.clearLink();
    this.iframeSize = (event.target as HTMLInputElement)?.value as 'small' | 'medium' | 'large' | '';
    this.refreshRender();
    if (this.iframeSize === '') {
      this.hideMapPreview();
    } else {
      this.showMapPreview();
    }
  }

  /**
   * Displays a greyed out area in the main map indicating the size of the embedded map.
   */
  private showMapPreview() {
    this.simpleMaskManager?.setMaskSize([this.iframeWidth, this.iframeHeight]);
    this.simpleMaskManager?.setMaskVisibility(true);
  }

  private hideMapPreview() {
    this.simpleMaskManager?.setMaskVisibility(false);
  }

  private showCopySuccessEffect(btnId: string) {
    const copyButton = this.shadow.getElementById(btnId) as HTMLDivElement;
    copyButton.classList.add('copy-success');
    setTimeout(() => copyButton.classList.remove('copy-success'), 1000);
  }

  public togglePanel(isVisible: boolean): void {
    this.isPanelVisible = isVisible;
    this.render();
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.initializeShortenerService();
  }
}

export default ShareComponent;
