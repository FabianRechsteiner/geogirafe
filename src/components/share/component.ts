import TwitterLogo from './images/twitter.svg';
import FacebookLogo from './images/facebook.svg';
import LinkedInLogo from './images/linkedin.svg';
import MailLogo from './images/mail.svg';
import ShareManager from '../../tools/share/sharemanager';
import { IUrlShortener } from './tools/iurlshortener';
import LstuManager from './tools/lstumanager';
import GmfManager from './tools/gmfmanager';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import SimpleMaskManager from '../../tools/layers/simplemaskmanager';
import MapManager from '../../tools/state/mapManager';
import type { Callback } from '../../tools/state/statemanager';
import { debounce } from '../../tools/utils/debounce';

class ShareComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;
  loading = true;
  shareLink?: string;
  qrCode?: string;
  success: boolean = true;
  twitterLogo: string = TwitterLogo;
  facebookLogo: string = FacebookLogo;
  linkedInLogo: string = LinkedInLogo;
  mailLogo: string = MailLogo;
  iframeUrl?: string;
  iframeCode?: string;

  shareManager: ShareManager;
  urlShortener?: IUrlShortener;
  private readonly mapManager: MapManager;
  private simpleMaskManager?: SimpleMaskManager;

  private readonly eventsCallbacks: Callback[] = [];

  iframeSize: 'small' | 'medium' | 'large' | '' = '';
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
    this.mapManager = MapManager.getInstance();
  }

  initializeShortenerService() {
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
    this.visible ? this.renderComponent() : this.renderEmptyComponent();
    super.girafeTranslate();
  }

  /**
   * Renders the component by calling the necessary methods.
   * @private
   */
  private renderComponent() {
    super.render();

    this.simpleMaskManager = new SimpleMaskManager(this.mapManager.getMap());

    // While the component is visible, listen for changes in the state to update the shared link
    this.registerEvents();

    void this.generateShareLink();
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

  private registerEvents() {
    // Use a debounced version of the share link generation with 500ms delay to reduce the number of times it's called
    //  from tree view changes (can go up to 100x times).
    const debouncedShareLinkCallback = debounce(() => {
      void this.generateShareLink();
    }, 500);

    this.eventsCallbacks.push(
      this.subscribe('position', () => debouncedShareLinkCallback()),
      this.subscribe('layers.layersList', () => debouncedShareLinkCallback()),
      this.subscribe(/layers\.layersList\..*\.activeState/, () => debouncedShareLinkCallback()),
      this.subscribe(/layers\.layersList\..*\.order/, () => debouncedShareLinkCallback()),
      this.subscribe('activeBasemap', () => debouncedShareLinkCallback())
    );
  }

  private unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
  }

  private async generateShareLink() {
    if (!this.urlShortener) {
      return;
    }
    this.loading = true;
    this.shareLink = '';
    this.iframeUrl = '';
    this.iframeCode = '';
    this.refreshRender();

    try {
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
    } finally {
      this.loading = false;
      this.refreshRender();
    }
  }

  setIframeCode() {
    if (this.iframeSize && this.iframeUrl) {
      this.iframeCode = `<iframe title="iframe GeoGirafe" width="${this.iframeWidth}" height="${this.iframeHeight}" src="${this.iframeUrl}"></iframe>`;
    } else {
      this.iframeCode = '';
    }
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

  copyToClipboard(type: 'short' | 'iframe') {
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

  onSizeChanged(event: Event) {
    this.iframeSize = (event.target as HTMLInputElement)?.value as 'small' | 'medium' | 'large' | '';
    this.setIframeCode();
    this.refreshRender();
    if (this.iframeSize) {
      this.showMapPreview();
    } else {
      this.hideMapPreview();
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

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.initializeShortenerService();
      this.subscribe('interface.sharePanelVisible', (_, newValue) => {
        this.visible = newValue;
        this.render();
      });
    });
  }
}

export default ShareComponent;
