import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import ShareManager from '../../tools/share/sharemanager';

class ContactComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;
  shortUrl = '';

  constructor() {
    super('contact');
  }

  private registerEvents() {
    this.subscribe('interface.contactPanelVisible', (_oldValue: boolean, newValue: boolean) =>
      this.togglePanel(newValue)
    );
  }

  private togglePanel(visible: boolean) {
    this.visible = visible;
    if (visible) {
      this.shortUrl = this.getCurrentStateUrl();
    }
    this.render();
  }

  private getCurrentStateUrl() {
    const currentUrl = new URL(window.location.href);
    const baseUrl = `${currentUrl.protocol}//${currentUrl.host}${currentUrl.pathname}`;
    const hash = ShareManager.getInstance().getStateToShare();
    return `${baseUrl}#${hash}`;
  }

  public async sendMessage() {
    const email = (this.shadow.getElementById('email') as HTMLInputElement).value;
    const reason = (this.shadow.getElementById('reason') as HTMLSelectElement).value;
    const message = (this.shadow.getElementById('message') as HTMLTextAreaElement).value;

    if (!this.configManager.Config.contact?.reasons.includes(reason)) {
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

    const response = await fetch(this.configManager.Config.contact.url, {
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
        `Something went wrong and your message could not be sent. Please try again or contact us directly at ${this.configManager.Config.contact.email}`,
        'Cannot send message'
      );
    }
  }

  render() {
    if (this.visible) {
      super.render();
    } else {
      this.hide();
    }
    super.girafeTranslate();
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.registerEvents();
      this.render();
    });
  }
}

export default ContactComponent;
