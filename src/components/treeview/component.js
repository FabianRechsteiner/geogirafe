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
    const childServer = (elem.ogcServer) ? elem.ogcServer : parentServer;
    
    // Add icons
    let needsLegend = this.renderLeafIcons(li, elem, childServer);

    // Add label
    // Otherwise, we use the server of the parent
    this.renderLeafLabel(li, elem, childServer);
    li.dataset.active = false;

    if (needsLegend) {
      // Add legend
      this.renderLegend(li, elem, childServer)
    }

    // Append childs if any
    if (elem.children !== undefined) {
      this.renderChilds(li, elem, childServer);
    }
  }

  renderLegend(li, elem, server) {
    // Add a image for the legend.
    const legendId = 'LEG-' + elem.layers;
    const legendimg = document.createElement('img');
    legendimg.id = legendId;
    legendimg.className = 'legend';
    li.append(legendimg);
    legendimg.style.display = (elem.metadata.isLegendExpanded) ? 'block' : 'none';
    const url = this.servers[server].url
    // Request legend image from openlayers
    this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'requestLegendUrl', layer: elem.layers, id: legendId, serverurl: url});
  }

  renderSelectionCircle(li) {
    const circle = document.createElement('i');
    circle.dataset.circle = true;
    circle.className = 'fa-xs fa-regular fa-circle';
    li.append(circle);
  }

  renderLeafIcons(li, elem, server) {
    // This function returns true if a placeholder for a whole legend mut be added
    // False is not placeholder is needed
    let legendNeeded = false;
    if (!elem.childLayers) {
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
      if (elem.metadata.iconUrl) {
        // A custom Legend icon has been defined.
        // => We just use it
        const icon = document.createElement('img');
        icon.src = elem.metadata.iconUrl;
        icon.className = 'iconurl';
        li.append(icon);
      }
      else if (elem.metadata.legend == true) {
        // A whole legend needs to be display.
        // => We add a legend button and the legend circle
        this.renderSelectionCircle(li)

        // Add icon for legend toggle
        const legendId = 'LEG-' + elem.layers;
        const legend = document.createElement('i');
        legend.className = 'fg-map-legend tool selectable';
        legend.setAttribute('tip', 'Toggle legend');
        legend.onclick = (e) => this.toggleLegend(this, legendId, e);
        li.append(legend);
        legendNeeded = true;
      }
      else {
        // Last case :
        // We need to get the legendicon URL from openlayer
        // before we can show the legend icon
        // TODO REG : use elem.metadata.legendRule
        const legendId = 'LEG-' + elem.layers;
        const icon = document.createElement('img');
        icon.id = legendId;
        icon.className = 'iconurl';
        li.append(icon);

        const url = this.servers[server].url
        this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'requestLegendUrl', layer: elem.layers, id: legendId, serverurl: url, rule: elem.metadata.legendRule});
      }

      // Add an icon to control the layer opacity
      /*const opacity = document.createElement('i');
      opacity.className = 'fg-screen-map-o tool selectable';
      opacity.setAttribute('tip', 'Control opacity');
      opacity.onclick = (e) => this.setOpacity(elem.);
      li.append(opacity);*/

      // On the childs, we can have a icon to zoom to the right resolution, where the layer will be visible
      if (!this.resolutionIsDefault(elem.minResolutionHint, elem.maxResolutionHint)) {
        const resolutionZoom = document.createElement('i');
        resolutionZoom.className = 'fg-zoom-in tool selectable';
        resolutionZoom.setAttribute('tip', 'Zoom to visible resolution');
        resolutionZoom.onclick = (e) => this.zoomToResolution(elem.minResolutionHint, elem.maxResolutionHint);
        li.append(resolutionZoom);
      }
    }

    return legendNeeded;
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
  
  renderLeafLabel(li, elem, server) {
    // Add label
    const span = document.createElement('span');
    span.setAttribute('i18n', 'girafe');
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
        "maxResolution": elem.maxResolutionHint,
        "opacity": 1
      };
      this.layers.push(layer);
      span.dataset.value = this.layers.length - 1;

      // Resolutions
      if (!this.resolutionIsDefault(elem.minResolutionHint, elem.maxResolutionHint))
      {
        span.dataset.minResolution = elem.minResolutionHint;
        span.dataset.maxResolution = elem.maxResolutionHint;
      }
    }
  }

  resolutionIsDefault(minResolution, maxResolution) {
    return (minResolution === 0 && maxResolution === 999999999)
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

  toggle(_this, e) {
    const li = e.target.parentElement;
    const circle = li.querySelector('[data-circle="true"]');
    let action = null;
    let circleClass = null;
    if (li.dataset.active === 'true') {
      // Deactivate layer
      li.className = '';
      circleClass = 'fa-xs fa-regular fa-circle';
      action = 'layerDisabled';
      li.dataset.active = false;
    }
    else {
      // Activate layer
      li.className = 'active';
      circleClass = 'fa-xs fa-solid fa-circle';
      action = 'layerEnabled';
      li.dataset.active = true;
    }

    if (circle !== null) {
      // There is a selection circle (no legend icon)
      circle.className = circleClass;
    }

    // Toggle parent if necessary
    this.toggleParent(li);

    if (e.target.dataset.value) {
      // We have data on this layer.
      // => We are on a leaf with layer infos
      // We send a message to activate/deactivate this layer
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: action, layer: _this.layers[e.target.dataset.value]});
    }
  }

  toggleParent(li) {
    const ul = li.parentElement;
    if (ul === null || ul.nodeName !== 'UL' || ul.parentElement === null) {
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
