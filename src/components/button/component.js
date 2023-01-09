import GeoEvents from '/models/events.js';
import GirafeHTMLElement from '/base/GirafeHTMLElement';

class ButtonComponent extends GirafeHTMLElement {

  button = null;
  icon = null;
  textSpan = null;
  text = null;

  geoevent = null;
  option = null;
  href = null;
  
  constructor() {
    super('button');
  }

  render() {
    super.render();
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
      this.button.appendChild(this.textSpan);
    }
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
    if (this.hasAttribute('message') && this.hasAttribute('action')) {
      const message = this.getAttribute('message');
      this.geoevent = this.getGeoEventType(message);
      this.options = {};
      this.options.action = this.getAttribute('action');

      // Get message attributes from dataset if there is any
      for (let key in this.dataset) {
        this.options[key] = this.dataset[key];
      }
    }

    this.button.addEventListener('click', (e) => this.onClick());
  }

  onClick() {
    if (this.href !== null) {
      // Open link in a new tab
      window.open(this.href, '_blank');
    }
    else if (this.message !== null) {
      // send message
      this.messageManager.sendMessage(this.geoevent, this.options);
    }

    // Close parent menu-button if any
    const parentMenuButton = this.getParentMenuButton(this.shadow.host.parentNode);
    if (parentMenuButton !== null) {
      parentMenuButton.closeMenu();
    }
  }

  getParentMenuButton(elem) {
    // Stop case : we found null or a menu-button object
    if (elem === null || elem.nodeName === 'GIRAFE-MENU-BUTTON') {
      return elem;
    }

    // Otherwise, we try to find a perent recursively
    let parent = null;
    if (elem instanceof ShadowRoot) {
      parent = elem.host;
    }
    else {
      parent = elem.parentNode;
    }

    return this.getParentMenuButton(parent);
  }

  getGeoEventType(message) {
    switch(message) {
      case 'RedLining':
        return GeoEvents.RedLining;
      case 'TreeView':
        return GeoEvents.TreeView;
      case 'Map':
        return GeoEvents.Map;
      case 'App':
        return GeoEvents.App;
      case 'Theme':
        return GeoEvents.Theme;
      case 'Init':
        return GeoEvents.Init;
      case 'Translate':
        return GeoEvents.Translate;
      case 'Redlining':
        return GeoEvents.Redlining;
    }
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-button', ButtonComponent);

export default ButtonComponent;