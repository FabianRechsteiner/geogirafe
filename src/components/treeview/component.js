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
    const span = document.createElement('span');
    span.textContent = elem.name;
    span.style.cursor = 'pointer';
    span.onclick = (e) => this.toggle(this, e);

    const li = document.createElement('li');
    li.appendChild(span);
    ulParent.appendChild(li);

    // If a server is defined on this node, we use it.
    // Otherwise, we use the server of the parent
    const childServer = (elem.ogcServer) ? elem.ogcServer : parentServer;

    if (elem.childLayers) {
      // We are on a layer linked to a server.
      // It means this one can be queried from WMS
      let url = null;
      if (childServer) {
        url = this.servers[childServer].url
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

    // Append childs if any
    if (elem.children !== undefined) {
      this.renderChilds(li, elem, childServer);
    }
  }

  toggle(_this, e) {
    const ulChild = e.target.nextElementSibling;
    if (ulChild === null) {
      // No more child.
      window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
        bubbles: true, cancelable: false, composed: true, 
        detail: {
          action: 'layerEnabled',
          layer: _this.layers[e.target.dataset.value]
        }
      }));
      console.log();
      return;
    }

    if (ulChild.style.display === 'none') {
      ulChild.style.display = 'block';
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
      window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
        bubbles: true, cancelable: false, composed: true, 
        detail: {
          action: 'groupClosed',
          group: e.target.innerHTML
        }
      }));
    }
  }
}

customElements.define('girafe-tree-view', TreeViewComponent);
