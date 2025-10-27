import GirafeHTMLElement from '../../base/GirafeHTMLElement';

type ModalType = 'alert' | 'confirm' | 'prompt';

class ModalsComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible: boolean = false;
  boxType?: ModalType;
  boxTitle?: string;
  boxMessage?: string;
  boxPlaceholder?: string;
  resolveAlertConfirm!: (value: boolean) => void;
  resolvePrompt!: (value: string | false) => void;

  constructor() {
    super('native-modals');
  }

  private initBox(type: ModalType, message: string, title?: string, placeholder?: string) {
    this.boxType = type;
    this.boxMessage = this.context.i18nManager.getTranslation(message);
    if (title) {
      this.boxTitle = this.context.i18nManager.getTranslation(title);
    }
    if (placeholder) {
      this.boxPlaceholder = this.context.i18nManager.getTranslation(placeholder);
    }

    this.visible = true;
    this.refreshRender();
  }

  private resetBox() {
    this.visible = false;
    this.boxType = undefined;
    this.boxTitle = undefined;
    this.boxMessage = undefined;
    this.boxPlaceholder = undefined;
    this.refreshRender();
  }

  private async promptBox(message: string, title?: string, placeholder?: string): Promise<string | false> {
    this.initBox('prompt', message, title, placeholder);

    return new Promise((resolve) => {
      this.resolvePrompt = resolve;
    });
  }

  private async alertConfirmBox(type: ModalType, message: string, title?: string): Promise<boolean> {
    this.initBox(type, message, title);

    return new Promise((resolve) => {
      this.resolveAlertConfirm = resolve;
    });
  }

  public ok() {
    this.resetBox();
    this.resolveAlertConfirm(true);
  }

  public nok() {
    this.resetBox();
    this.resolveAlertConfirm(false);
  }

  public promptOk() {
    const input = this.shadow.getElementById('input-text') as HTMLInputElement;
    const text = input.value;
    input.value = '';
    this.resetBox();
    this.resolvePrompt(text);
  }

  public promptNok() {
    this.resetBox();
    this.resolvePrompt(false);
  }

  render() {
    super.render();
  }

  connectedCallback() {
    super.connectedCallback();
    window.gConfirm = (message: string, title?: string): Promise<boolean> =>
      this.alertConfirmBox('confirm', message, title);
    window.gAlert = (message: string, title?: string): Promise<boolean> =>
      this.alertConfirmBox('alert', message, title);
    window.gPrompt = (message: string, title?: string, placeholder?: string): Promise<string | false> =>
      this.promptBox(message, title, placeholder);

    this.render();
    super.girafeTranslate();
  }
}

export default ModalsComponent;
