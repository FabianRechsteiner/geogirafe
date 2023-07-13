import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class ButtonComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  button = null;
  container = null;
  icon = null;
  textSpan = null;
  text = null;

  option = null;
  href = null;
  
  constructor() {
    super('button');
  }

  render() {
    super.render();
    this.container = this.shadow.querySelector('#container');
    this.button = this.shadow.querySelector('#button');

    if (this.hasAttribute('icon-style')) {
      // Add icon
      this.icon = document.createElement('i');
      this.icon.className = this.getAttribute('icon-style');
      this.button.appendChild(this.icon);
    }
    if (this.hasAttribute('text')) {
      // Add text
      this.text = this.getAttribute('text');
      this.textSpan = document.createElement('span');
      this.textSpan.innerHTML = this.text;
      this.textSpan.setAttribute('i18n', this.text);
      this.button.appendChild(this.textSpan);
    }
    if (this.hasAttribute('size')) {
      // Add text
      const size = this.getAttribute('size');
      this.button.classList.add(size);
    }
    // Apply all style from host to container
    this.container.classList = this.classList;
    
    this.setButtonStyle();
  }

  setButtonStyle() {
    if (this.icon !== null && this.textSpan !== null) {
      // If both icon and text were set, we need to adapt the style in order to make both visible
      this.button.className = "hybrid";
    }
  }

  setText(text) {
    if (this.textSpan !== null && this.isNullOrUndefinedOrBlank(text)) {
      // Text exists and must be removed from button
      this.text = null;
      this.textSpan.remove();
      this.textSpan = null;
    }
    else if (this.textSpan === null && !this.isNullOrUndefinedOrBlank(text)) {
      // text does not exists yet and has to be created
      this.text = text;
      this.textSpan = document.createElement('span');
      this.textSpan.innerHTML = this.text;
      if (this.button !== null) {
        this.button.appendChild(this.textSpan)
      }
      else {
        // This function can be called before the component if full initialized
        // Therefore, we have to delay the execution, because this.button can still be null
        super.delayed(
          () => { return this.button !== null }, 
          () => this.button.appendChild(this.textSpan)
        );
      }
    }
    else {
      // Text already exists and has to be changed
      this.text = text;
      this.textSpan.innerHTML = this.text;
    }
    this.setButtonStyle();
  }

  registerEvents() {
    if (this.hasAttribute('href')) {
      this.href = this.getAttribute('href');
    }
    else if (this.hasAttribute('message')) {
      this.options = {};
      this.options.message = this.getAttribute('message');

      // Get message attributes from dataset if there is any
      for (let key in this.dataset) {
        this.options[key] = this.dataset[key];
      }
    }
    else if (this.hasAttribute('state-action')) {
      this.actionState = this.getAttribute('state-action');
      this.actionValue = this.getActionValue();
    }

    // Observe parent to adapt to attribute changes
    const observer = new MutationObserver(this.parentAttributeChanged.bind(this));
    observer.observe(this, { attributes: true });

    this.button.addEventListener('click', (e) => this.onClick());
  }

  getActionValue() {
    if (Object.keys(this.dataset).length > 1) {
      // Only one parameter is authorized here, because the state method is invoked dynamically
      // And we cannot control the order of the parameters for the state update in the onClick() method.
      // So for now, we send an error if more than 1 parameter is set.
      throw 'Maximum 1 parameter is allowed here.';
    }

    if (Object.keys(this.dataset).length === 0) {
      // No value was defined here.
      // We consider it as a "boolean switch"
      return null;
    }

    // There is a value. We use it as a value
    const value = Object.values(this.dataset)[0];
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

    return value;
  }

  parentAttributeChanged(mutationList, observer) {
    mutationList.forEach(mutation => {
      if (mutation.attributeName === 'class') {
        // Apply all style from host to container
        this.container.classList = this.classList;
      }
    });
  }

  onClick() {
    if (!this.isNullOrUndefined(this.href)) {
      // Open link in a new tab
      window.open(this.href, '_blank');
    }
    else if (!this.isNullOrUndefined(this.message)) {
      // send message
      this.messageManager.sendMessage(this.options);
    }
    else if (!this.isNullOrUndefined(this.actionState)) {
      // update state
      const keys = this.actionState.split('.');
      let state = this.state;
      for (let i=0; i<keys.length-1; ++i) {
        state = state[keys[i]];
      }

      if (this.actionValue === null) {
        if (typeof state[keys[keys.length-1]] !== 'boolean') {
          // The value is not a boolean, and no action-value was defined
          // In this case, we should "invert" the boolean.
          // => we cannt do this, because it isn't a boolean
          throw "Cannot invert boolean value : it isn't a boolean";
        }
        state[keys[keys.length-1]] = !state[keys[keys.length-1]];
      }
      else {
        state[keys[keys.length-1]] = this.actionValue;
      }
    }

    // Close parent menu-button if any
    const parentMenuButton = super.getParentOfType('GIRAFE-MENU-BUTTON', this.shadow.host.parentNode);
    if (parentMenuButton !== null) {
      parentMenuButton.closeMenu();
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.translate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-button', ButtonComponent);

export default ButtonComponent;