import GeoEvents from '/models/events.js';

class TreeViewComponent extends HTMLElement {

  static #template = null;
  themesUrl = null;
  themesJson = {};
  servers = {};
  layers = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.themesUrl = this.getAttribute('themes');
  }

  connectedCallback() {
    this.loadTemplate()
      .then(() => this.loadThemes()
        .then(() => this.render())
      )
  }

  async loadThemes() {
    const response = await fetch(this.themesUrl);
    const content = await response.json();
    this.themesJson = content["themes"];
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
    const ulRoot = this.shadow.querySelector('#treeview-list');

    this.themesJson.forEach(elem => {
      this.renderLeaf(ulRoot, elem, null);
    });
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
      span.dataset.active = false;
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
    let action = null;
    if (e.target.dataset.active === 'true') {
      // Deactivate layer
      li.className = '';
      action = 'layerDisabled';
      e.target.dataset.active = false;
    }
    else {
      // Activate layer
      li.className = 'active';
      action = 'layerEnabled';
      e.target.dataset.active = true;
    }

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
}

customElements.define('girafe-tree-view', TreeViewComponent);
