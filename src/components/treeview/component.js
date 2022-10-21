import tippy from 'tippy.js';
import Layer from '/models/layer';
import GeoEvents from '/models/events';
import GirafeResizableElement from '/base/GirafeResizableElement'

class TreeViewComponent extends GirafeResizableElement {

  static #template = null;
  themesUrl = null;
  servers = {};
  layers = [];
  ulRoot = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
    this.themesUrl = this.getAttribute('themes');
    this.registerEvents();
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Theme, (e) => this.onThemeEvent(e.detail));
    window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));
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
    this.messageManager.sendMessage(GeoEvents.Init, {action: 'componentInitialized'});
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
    this.makeResizable();

    this.ulRoot = this.shadow.querySelector('#treeview-list');
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

    // If a server is defined on this node, we use it.
    // Otherwise, we use the server of the parent
    const childServer = (elem.ogcServer) ? elem.ogcServer : parentServer;

    // Create Layer
    const layer = this.createLayer(elem, childServer);
    li.dataset.active = false;
    li.dataset.layerid = layer.id;

    // Add icons
    this.renderLeafIcons(li, layer);
    // Add label
    this.renderLeafLabel(li, layer);
    
    if (layer.hasLegend) {
      // Add legend
      this.renderLegend(li, layer)
    }

    // Append childs if any
    if (elem.children !== undefined) {
      this.renderChilds(li, elem, childServer);
    }
  }

  createLayer(elem, server) {
      let url = null;
      if (server) {
        url = this.servers[server].url
      }
      else {
        console.log('NOT OGC SERVER FOR ' + elem.name);
      }
      const layer = new Layer(elem, server, url);
      this.layers.push(layer);

      // The id is the index of the layer in the layer list
      layer.id = this.layers.length - 1;
      return layer;
  }

  renderLegend(li, layer) {
    // Add a image for the legend.
    const legendimg = document.createElement('img');
    legendimg.id = layer.legendId;
    legendimg.className = 'legend';
    li.append(legendimg);
    legendimg.style.display = (layer.isLegendExpanded) ? 'block' : 'none';
    // Request legend image from openlayers
    this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'requestLegendUrl', layer: layer});
  }

  renderSelectionCircle(li) {
    const circle = document.createElement('i');
    circle.dataset.circle = true;
    circle.className = 'fa-xs fa-regular fa-circle';
    li.append(circle);
  }

  renderLeafIcons(li, layer) {
    // This function returns true if a placeholder for a whole legend mut be added
    // False is not placeholder is needed
    if (layer.isGroup) {
      // We are not on a child layer
      // => Add caret and selection icon
      const caret = document.createElement('i');
      caret.className = 'fa fa-caret-right selectable';
      caret.onclick = (e) => this.expand(this, e);
      li.append(caret);

      this.renderSelectionCircle(li)
    }
    else {
      // We are on a child
      // => Add spacer (replaces the caret)
      const spacer = document.createElement('i');
      li.append(spacer);

      // => Add iconUrl if any
      if (layer.iconUrl) {
        // A custom Legend icon has been defined.
        // => We just use it
        const icon = document.createElement('img');
        icon.src = layer.iconUrl;
        icon.className = 'iconurl';
        li.append(icon);
      }
      else if (layer.hasLegend) {
        // A whole legend needs to be display.
        // => We add a legend button and the legend circle
        this.renderSelectionCircle(li)

        // Add icon for legend toggle
        const legend = document.createElement('i');
        legend.className = 'fg-map-legend tool selectable';
        legend.setAttribute('tip', 'Toggle legend');
        legend.onclick = (e) => this.toggleLegend(this, layer.legendId, e);
        li.append(legend);
      }
      else {
        // Last case :
        // We need to get the legendicon URL from openlayer
        // before we can show the legend icon
        const icon = document.createElement('img');
        icon.id = layer.legendId;
        icon.className = 'iconurl';
        li.append(icon);

        this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'requestLegendUrl', layer: layer});
      }

      // Add an icon to control the layer opacity
      const opacity = document.createElement('i');
      opacity.className = 'fg-layer-alt tool selectable';
      opacity.setAttribute('tip', 'Control opacity');
      tippy(opacity, {
        trigger: 'click',
        arrow: true,
        interactive: true,
        theme: 'light',
        placement: 'bottom-end',
        content: (reference) => {
          const slider = document.createElement('input');
          slider.type = 'range';
          slider.className = 'slider';
          slider.min = 0;
          slider.max = 20;
          slider.value = layer.opacity*20;
          slider.oninput = (e) => this.changeOpacity(layer, reference, e);
          return slider;
        }
      });
      li.append(opacity);

      // On the childs, we can have a icon to zoom to the right resolution, where the layer will be visible
      if (layer.hasRestrictedResolution()) {
        const resolutionZoom = document.createElement('i');
        resolutionZoom.className = 'fg-zoom-in tool selectable';
        resolutionZoom.setAttribute('tip', 'Zoom to visible resolution');
        resolutionZoom.onclick = (e) => this.zoomToResolution(layer.minResolution, layer.maxResolution);
        li.append(resolutionZoom);
      }
    }
  }

  changeOpacity(layer, reference, e) {
    layer.opacity = e.target.value/20;
    if (layer.isTransparent) {
      reference.classList.remove('fg-layer-alt');
      reference.classList.add('fg-layer-alt-o');
    }
    else {
      reference.classList.remove('fg-layer-alt-o');
      reference.classList.add('fg-layer-alt');
    }
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'opacityChanged', layer: layer});
  }

  zoomToResolution(minResolution, maxResolution) {
    // Because of rounding errors (for example 1.59 becomes 1.589999999999998), 
    // we zoom a bit more than just the max resolution.
    // For the moment we try with 10% more
    const resolution = maxResolution - 10/100*maxResolution;
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'zoomToResolution', resolution: resolution });
  }

  toggleLegend(_this, legendId, e) {
    console.log('TOGGLE LEGEND ' + legendId);
    const legend = _this.shadow.querySelector('#' + legendId);
    if (legend.style.display === 'none') {
      legend.style.display = 'block';
    }
    else {
      legend.style.display = 'none';
    }
  }
  
  renderLeafLabel(li, layer) {
    // Add label
    const span = document.createElement('span');
    span.setAttribute('i18n', 'girafe');
    span.textContent = layer.name;
    span.className = 'selectable';
    span.onclick = (e) => this.toggle(this, e, layer);
    li.appendChild(span);

    if (layer.isLayer) {
      // We are on a layer linked to a server.
      if (layer.hasRestrictedResolution())
      {
        span.dataset.minResolution = layer.minResolution;
        span.dataset.maxResolution = layer.maxResolution;
      }
    }
  }

  expand(_this, e) {
    const ulChild = e.target.parentElement.getElementsByTagName('ul')[0];
    if (ulChild.style.display === 'none') {
      ulChild.style.display = 'block';
      e.target.className = 'fa fa-caret-down selectable';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'groupOpened', group: e.target.innerHTML});
    }
    else {
      ulChild.style.display = 'none';
      e.target.className = 'fa fa-caret-right selectable';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'groupClosed', group: e.target.innerHTML});
    }
  }

  toggle(_this, e, layer) {
    const li = e.target.parentElement;

    const setActive = !(li.dataset.active === 'true');
    this.toggleLeaf(li, setActive);

    // Toggle childs
    if (layer.isGroup) {
      const toggledLayers = this.toggleChilds(li, setActive);
      const action = (setActive) ? 'layerListEnabled' : 'layerListDisabled';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: action, layerList: toggledLayers});
    }

    // Toggle parent if necessary
    this.toggleParent(li);

    if (layer.isLayer) {
      // We have data on this layer.
      // => We are on a leaf with layer infos
      // We send a message to activate/deactivate this layer
      const action = (li.dataset.active === 'true') ? 'layerEnabled' : 'layerDisabled';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: action, layer: layer});
    }
  }

  toggleLeaf(li, setActive) {
    const circle = li.querySelector('[data-circle="true"]');
    let circleClass = null;
    if (setActive) {
      // Activate layer
      li.className = 'active';
      circleClass = 'fa-xs fa-solid fa-circle';
      li.dataset.active = true;
    }
    else {
      // Deactivate layer
      li.className = '';
      circleClass = 'fa-xs fa-regular fa-circle';
      li.dataset.active = false;
    }

    if (circle !== null) {
      // There is a selection circle (no legend icon)
      circle.className = circleClass;
    }
  }

  toggleChilds(li, setActive) {
    const ul = li.getElementsByTagName('ul')[0];
    if (this.isNullOrUndefined(ul)) {
      // We are on the last leaf.
      // => Stop here
      return [];
    }

    let toggledLayers = [];
    const childLis = ul.getElementsByTagName('li');
    for (let i=0; i<childLis.length; i++) {
      const childLi = childLis[i];
      this.toggleLeaf(childLi, setActive);
      toggledLayers.push(this.layers[childLi.dataset.layerid]);
    }

    return toggledLayers;
  }

  toggleParent(li) {
    const ul = li.parentElement;
    if (this.isNullOrUndefined(ul) || ul === this.ulRoot) {
      // We get out the tree-view (or to the root element).
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
    if (details.action === 'themeChanged') {
      this.onChangeTheme(details.theme);
    }
  }

  onTreeViewEvent(details) {
    if (details.action === 'responseLegendUrl') {
      this.onLegendUrlChanged(details.id, details.url);
    }
  }

  onMapEvent(details) {
    if (details.action === 'resolutionChanged') {
      this.onResolutionChanged(details.resolution);
    }
  }

  onResolutionChanged(resolution) {
    console.log(resolution);
    const spans = this.ulRoot.getElementsByTagName('span');
    for (let i=0; i<spans.length; i++) {
      const span = spans[i];
      let ok = false;
      if (this.isNullOrUndefined(span.dataset.maxResolution) || this.isNullOrUndefined(span.dataset.minResolution)) {
        // No resolution. Always visible
        ok = true;
      }
      else if (resolution < span.dataset.maxResolution && resolution > span.dataset.minResolution) {
        // Layer is visible for the current resolution
        ok = true;
      }

      if (ok) {
        span.classList.add('resok');
        span.classList.remove('resnok');
      }
      else {
        span.classList.add('resnok');
        span.classList.remove('resok');
      }
    }
  }

  onLegendUrlChanged(id, url) {
    const img = this.shadow.querySelector('#' + id);
    img.src = url;
  }

  onChangeTheme(theme) {
    // Clear existing TreeView;
    this.ulRoot.innerHTML = '';

    // Add the current theme
    theme.children.forEach(elem => {
      this.renderLeaf(this.ulRoot, elem, null);
    });

    this.activateTooltips(false, [800, 0], 'right');
  }
}

customElements.define('girafe-tree-view', TreeViewComponent);

export default TreeViewComponent;
