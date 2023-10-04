import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MenuButtonComponent from '../menubutton/component';

class ButtonComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  button!: HTMLElement;
  container!: HTMLElement;
  icon: HTMLElement | null = null;
  textSpan: HTMLElement | null = null;
  text: string | null = null;

  option: any = null;
  href: string | null = null;

  actionState: string | null = null;
  actionValue: string | boolean | (string | number)[] | null = null;
  
  constructor() {
    super('button');
  }

  render() {
    super.render();
    this.container = this.shadow.querySelector('#container') as HTMLElement;
    this.button = this.shadow.querySelector('#button') as HTMLElement;

    if (this.hasAttribute('icon-style')) {
      // Add icon
      this.icon = document.createElement('i');
      this.icon.className = this.getAttribute('icon-style') as string;
      this.button.appendChild(this.icon);
    }
    if (this.hasAttribute('text')) {
      // Add text
      this.text = this.getAttribute('text') as string;
      this.textSpan = document.createElement('span');
      this.textSpan.innerHTML = this.text;
      this.textSpan.setAttribute('i18n', this.text);
      this.button.appendChild(this.textSpan);
    }
    if (this.hasAttribute('size')) {
      // Add text
      const size = this.getAttribute('size') as string;
      this.button.classList.add(size);
    }
    // Apply all style from host to container
    this.container.classList.add(...this.classList);
    
    this.setButtonStyle();
  }

  setButtonStyle() {
    if (this.icon !== null && this.textSpan !== null) {
      // If both icon and text were set, we need to adapt the style in order to make both visible
      this.button.className = 'hybrid';
    }
  }

  setText(text: string) {
    if (this.textSpan !== null && this.isNullOrUndefinedOrBlank(text)) {
      // Text exists and must be removed from button
      this.text = null;
      this.textSpan.remove();
      this.textSpan = null;
    }
    else if (this.textSpan === null && !this.isNullOrUndefinedOrBlank(text)) {
      // text does not exist yet and has to be created
      this.text = text;
      this.textSpan = document.createElement('span');
      this.textSpan.innerHTML = this.text;
      if (!this.isNullOrUndefined(this.button)) {
        this.button.appendChild(this.textSpan);
      }
      else {
        // This function can be called before the component is fully initialized
        // Therefore, we have to delay the execution, because this.button can still be null
        super.delayed(
          () => { return this.button !== null }, 
          () => this.button.appendChild(this.textSpan!)
        );
      }
    }
    else {
      // Text already exists and has to be changed
      this.text = text;
      this.textSpan!.innerHTML = this.text;
    }
    this.setButtonStyle();
  }

  registerEvents() {
    if (this.hasAttribute('href')) {
      this.href = this.getAttribute('href') as string;
    }
    else if (this.hasAttribute('message')) {
      this.option = {};
      this.option.message = this.getAttribute('message');

      // Get message attributes from dataset if there is any
      for (const key in this.dataset) {
        this.option[key] = this.dataset[key];
      }
    }
    else if (this.hasAttribute('state-action')) {
      this.actionState = this.getAttribute('state-action');
      this.actionValue = this.getActionValue();
    }

    // Observe parent to adapt to attribute changes
    const observer = new MutationObserver(this.parentAttributeChanged.bind(this));
    observer.observe(this, { attributes: true });

    this.button.addEventListener('click', () => this.onClick());
  }

  getActionValue() {
    if (Object.keys(this.dataset).length > 1) {
      // Only one parameter is authorized here, because the state method is invoked dynamically
      // And we cannot control the order of the parameters for the state update in the onClick() method.
      // So for now, we send an error if more than 1 parameter is set.
      throw new Error ('Maximum 1 parameter is allowed here.');
    }

    if (Object.keys(this.dataset).length === 0) {
      // No value was defined here.
      // We consider it as a "boolean switch"
      return null;
    }

    // There is a value. We use it as a value
    const value = Object.values(this.dataset)[0] as string;
    // Manage booleans
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    // Manage arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      const content = value.substring(1, value.length - 1);
      const array = content.split(',').map(item => parseFloat(item) ? parseFloat(item) : item);
      return array;
    }
    // String
    return value;
  }

  parentAttributeChanged(mutationList: MutationRecord[]) {
    mutationList.forEach(mutation => {
      if (mutation.attributeName === 'class') {
        // Apply all style from host to container
        this.container.classList.add(...this.classList);
      }
      if (mutation.attributeName === 'icon-style') {
        if (this.icon) {
          this.icon.className = this.getAttribute('icon-style') as string;
        }
      }
    });
  }

  onClick() {
    if (!this.isNullOrUndefined(this.href)) {
      // Open link in a new tab
      window.open(this.href!, '_blank');
    }
    else if (!this.isNullOrUndefined(this.option)) {
      // send message
      this.messageManager.sendMessage(this.option);
    }
    else if (!this.isNullOrUndefined(this.actionState)) {
      // update state
      const keys = this.actionState!.split('.');
      let state:{[index:string]: {}} = this.state as {};
      for (let i=0; i<keys.length-1; ++i) {
        state = state[keys[i]];
      }

      if (this.actionValue === null) {
        if (typeof state[keys[keys.length-1]] !== 'boolean') {
          // The value is not a boolean, and no action-value was defined
          // In this case, we should "invert" the boolean.
          // => we cannot do this, because it isn't a boolean
          throw new Error("Cannot invert boolean value: it isn't a boolean");
        }
        state[keys[keys.length-1]] = !state[keys[keys.length-1]];
      }
      else {
        state[keys[keys.length-1]] = this.actionValue;
      }
    }

    // Close parent menu-button if any
    const parentMenuButton = super.getParentOfType('GIRAFE-MENU-BUTTON', this.shadow.host.parentNode) as MenuButtonComponent;
    if (parentMenuButton !== null) {
      parentMenuButton.closeMenu();
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-button', ButtonComponent);

export default ButtonComponent;