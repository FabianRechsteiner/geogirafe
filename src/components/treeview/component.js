import GeoEvents from '/models/events.js';

class TreeViewComponent extends HTMLElement {

  static #template = null;
  themesUrl = null;
  servers = {};
  layers = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.themesUrl = this.getAttribute('themes');
    this.registerEvents();
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Theme, (e) => this.onThemeEvent(e.detail));
  }

  connectedCallback() {
    this.loadTemplate()
      .then(() => this.loadThemes()
        .then(() => {
          this.render();
          this.initialized();
        })
      )
  }

  initialized() {
    window.dispatchEvent(new CustomEvent(GeoEvents.Init, { 
      bubbles: true, cancelable: false, composed: true, 
      detail: {
        action: 'componentInitialized'
      }
    }));
  }

  async loadThemes() {
    const response = await fetch(this.themesUrl);
    const content = await response.json();
    this.servers = content["ogcServers"];
  }

  async loadTemplate() {
    if (TreeViewComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/treeview/template.html');
    const content = await response.text();
    TreeViewComponent.#template = document.createElement('template');
    TreeViewComponent.#template.innerHTML = content;
  }

  render() {
    this.shadow.appendChild(TreeViewComponent.#template.content.cloneNode(true));
  }

  renderChilds(liParent, elem, parentServer) {
    // Add new sub-list
    const ulChild = document.createElement('ul');
    ulChild.style.display = 'none';
    liParent.appendChild(ulChild);
    elem.children.forEach(child => {
      this.renderLeaf(ulChild, child, parentServer);
    });
  }

  renderLeaf(ulParent, elem, parentServer) {
    // Create new leaf
    const li = document.createElement('li');
    ulParent.appendChild(li);

    // Add icons
    this.renderLeafIcons(li, elem);

    // Add label
    // If a server is defined on this node, we use it.
    // Otherwise, we use the server of the parent
    const childServer = (elem.ogcServer) ? elem.ogcServer : parentServer;
    this.renderLeafLabel(li, elem, childServer);
    li.dataset.active = false;

    // Append childs if any
    if (elem.children !== undefined) {
      this.renderChilds(li, elem, childServer);
    }
  }

  renderLeafIcons(li, elem) {
    // Add caret or spacer
    const caret = document.createElement('i');
    if (!elem.childLayers) {
      // Add caret
      caret.className = 'fa fa-caret-right selectable';
      caret.onclick = (e) => this.expand(this, e);
    }
    li.append(caret);

    // Add selection circle
    const circle = document.createElement('i');
    circle.className = 'fa-xs fa-regular fa-circle';
    li.append(circle);
  }
  
  renderLeafLabel(li, elem, server) {
    // Add label
    const span = document.createElement('span');
    span.textContent = elem.name;
    span.className = 'selectable';
    span.onclick = (e) => this.toggle(this, e);
    li.appendChild(span);

    if (elem.childLayers) {
      // We are on a layer linked to a server.
      // It means this one can be queried from WMS
      let url = null;
      if (server) {
        url = this.servers[server].url
      }
      else {
        console.log('NOT OGC SERVER FOR ' + elem.name);
      }
      const layer = {
        "name": elem.name,
        "type": elem.type,
        "server": elem.ogcServer,
        "url": url,
        "imageType": elem.imageType,
        "layer": elem.layers,
        "minResolution": elem.minResolutionHint,
        "maxResolution": elem.maxResolutionHint
      };
      this.layers.push(layer);
      span.dataset.value = this.layers.length - 1;
    }
  }

  expand(_this, e) {
    const ulChild = e.target.parentElement.getElementsByTagName('ul')[0];
    if (ulChild.style.display === 'none') {
      ulChild.style.display = 'block';
      e.target.className = 'fa fa-caret-down selectable';
      window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
        bubbles: true, cancelable: false, composed: true, 
        detail: {
          action: 'groupOpened',
          group: e.target.innerHTML
        }
      }));
    }
    else {
      ulChild.style.display = 'none';
      e.target.className = 'fa fa-caret-right selectable';
      window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
        bubbles: true, cancelable: false, composed: true, 
        detail: {
          action: 'groupClosed',
          group: e.target.innerHTML
        }
      }));
    }
  }

  toggle(_this, e) {
    const li = e.target.parentElement;
    const circle = li.getElementsByTagName('i')[1];
    let action = null;
    if (li.dataset.active === 'true') {
      // Deactivate layer
      li.className = '';
      circle.className = 'fa-xs fa-regular fa-circle';
      action = 'layerDisabled';
      li.dataset.active = false;
    }
    else {
      // Activate layer
      li.className = 'active';
      circle.className = 'fa-xs fa-solid fa-circle';
      action = 'layerEnabled';
      li.dataset.active = true;
    }

    // Toggle parent if necessary
    this.toggleParent(li);

    if (e.target.dataset.value) {
      // We have data on this layer.
      // => We are on a leaf with layer infos
      // We send a message to activate/deactivate this layer
      window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
        bubbles: true, cancelable: false, composed: true, 
        detail: {
          action: action,
          layer: _this.layers[e.target.dataset.value]
        }
      }));
    }
  }

  toggleParent(li) {
    const ul = li.parentElement;
    if (ul.nodeName !== 'UL' || ul.parentElement === null) {
      // We get out the tree-view.
      // Just stop here
      return;
    }

    let allActive = true;
    let allInactive = true;

    const childLis = ul.getElementsByTagName('li');
    for (let i=0; i<childLis.length; i++) {
      if (childLis[i].dataset.active === 'true') {
        allInactive = false;
      }
      else if (childLis[i].dataset.active === 'false') {
        allActive = false;
      }
      else {
        // One of the node is in a 'semi' state
        allActive = false;
        allInactive = false;
      }
    }

    const liParent = ul.parentElement;
    const circle = liParent.getElementsByTagName('i')[1];
    
    let stateChanged = false;
    if (allActive && liParent.dataset.active !== 'true') {
      // Activate parent
      liParent.dataset.active = true;
      liParent.className = 'active';
      circle.className = 'fa-xs fa-solid fa-circle';
      stateChanged = true;
    }
    else if (allInactive && liParent.dataset.active !== 'false') {
      // Deactivate parent
      liParent.dataset.active = false;
      liParent.className = '';
      circle.className = 'fa-xs fa-regular fa-circle';
      stateChanged = true;
    }
    else if (liParent.dataset.active !== 'semi') {
      // Semi-active
      liParent.dataset.active = 'semi';
      liParent.className = '';
      circle.className = 'fa-xs fa-solid fa-circle-half-stroke';
      stateChanged = true;
    }

    if (stateChanged) {
      // Recursively call on parent
      this.toggleParent(liParent);
    }
  }

  onThemeEvent(details) {
    console.log(details);
    if (details.action === 'themeChanged') {
      this.onChangeTheme(details.theme);
    }
  }

  onChangeTheme(theme) {
    const ulRoot = this.shadow.querySelector('#treeview-list');
    // Clear existing TreeView;
    ulRoot.innerHTML = '';

    // Add the current theme
    theme.children.forEach(elem => {
      this.renderLeaf(ulRoot, elem, null);
    });
  }
}

customElements.define('girafe-tree-view', TreeViewComponent);

export default TreeViewComponent;
