// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import IGirafePanel from '../../tools/state/igirafepanel';

class ContactComponent extends GirafeHTMLElement implements IGirafePanel {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  isPanelVisible = false;
  panelTitle = 'contact-panel';
  panelTogglePath = 'interface.contactPanelVisible';

  shortUrl = '';

  public constructor() {
    super('contact');
  }

  public togglePanel(visible: boolean) {
    this.isPanelVisible = visible;
    if (visible) {
      this.shortUrl = this.getCurrentStateUrl();
    }
    this.render();
  }

  private getCurrentStateUrl() {
    const baseUrl = this.context.urlManager.getBaseUrlPath();
    const hash = this.context.shareManager.getStateToShare();
    return `${baseUrl}#${hash}`;
  }

  public async sendMessage() {
    const email = (this.shadow.getElementById('email') as HTMLInputElement).value;
    const reason = (this.shadow.getElementById('reason') as HTMLSelectElement).value;
    const message = (this.shadow.getElementById('message') as HTMLTextAreaElement).value;

    if (!this.context.configManager.Config.contact?.reasons.includes(reason)) {
      window.gAlert('Invalid reason', 'Cannot send message');
      return;
    }
    if (message.trim().length <= 0) {
      window.gAlert('Empty message', 'Cannot send message');
      return;
    }

    const data = new FormData();
    data.append('permalink', this.shortUrl);
    data.append('ua', navigator.userAgent);
    data.append('email', email);
    data.append('email_optional', '');
    data.append('reason', reason);
    data.append('feedback', message);

    const response = await fetch(this.context.configManager.Config.contact.url, {
      method: 'POST',
      body: data
    });
    if (response.ok) {
      window.gAlert(
        'Thanks for your message. If necessary, somebody will enter in contact with you as soon as possible.',
        'Message sent'
      );
    } else {
      window.gAlert(
        `Something went wrong and your message could not be sent. Please try again or contact us directly at ${this.context.configManager.Config.contact.email}`,
        'Cannot send message'
      );
    }
  }

  render() {
    if (this.isPanelVisible) {
      super.render();
    } else {
      this.hide();
    }
    super.girafeTranslate();
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
  }
}

export default ContactComponent;
