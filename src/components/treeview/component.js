import GeoEvents from '/models/events.js';

class TreeViewComponent extends HTMLElement {

  static #template = null;
  themesUrl = null;
  themesJson = {};

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
      this.renderLeaf(ulRoot, elem);
    });
  }

  renderChilds(liParent, elem) {
    // Add new sub-list
    const ulChild = document.createElement('ul');
    ulChild.style.display = 'none';
    liParent.appendChild(ulChild);
    elem.children.forEach(child => {
      this.renderLeaf(ulChild, child);
    });
  }

  renderLeaf(ulParent, elem) {

    // Create new leaf
    const span = document.createElement(`span`);
    span.textContent = elem.name;
    span.style.cursor = 'pointer';
    span.onclick = (e) => this.toggle(e);

    const li = document.createElement('li');
    li.appendChild(span);
    ulParent.appendChild(li);

    // Append childs if any
    if (elem.children !== undefined) {
      this.renderChilds(li, elem);
    }
  }

  toggle(e) {
    const ulChild = e.target.nextElementSibling;
    if (ulChild === null) {
      // No more child.
      return;
    }

    if (ulChild.style.display === 'none') {
      ulChild.style.display = 'block';
      window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
        bubbles: true, cancelable: false, composed: true, 
        detail: {
          action: 'leafOpened',
          leafName: e.target.innerHTML
        }
      }));
    }
    else {
      ulChild.style.display = 'none';
      window.dispatchEvent(new CustomEvent(GeoEvents.TreeView, { 
        bubbles: true, cancelable: false, composed: true, 
        detail: {
          action: 'leafClosed',
          leafName: e.target.innerHTML
        }
      }));
    }
  }
}

customElements.define('tree-view', TreeViewComponent);
