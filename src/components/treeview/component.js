import tippy from 'tippy.js';
import Layer from '/models/layer';
import GeoEvents from '/models/events';
import GirafeResizableElement from '/base/GirafeResizableElement'
import I18nManager from '/tools/i18nmanager';

class TreeViewComponent extends GirafeResizableElement {

  themesUrl = null;
  servers = {};
  layers = [];
  ulRoot = null;
  advanced = false;
  allLegendsDisplayed = true;
  allLayersExpanded = false;

  constructor() {
    super('treeview');
    this.themesUrl = this.getAttribute('themes');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Theme, (e) => this.onThemeEvent(e.detail));
    window.addEventListener(GeoEvents.TreeView, (e) => this.onTreeViewEvent(e.detail));
    window.addEventListener(GeoEvents.Map, (e) => this.onMapEvent(e.detail));

    this.optionsButton.addEventListener('click', (e) => this.toggleAdvancedOptions(e));
    this.toggleLegendsButton.addEventListener('click', () => this.toggleAllLegends(this));
    this.expandAllButton.addEventListener('click', () => this.expandAllLayers(this));
    this.swipeButton.addEventListener('click', (e) => this.toggleSwipe(e));
    this.deleteButton.addEventListener('click', () => this.deleteAllLayers());
  }

  connectedCallback() {
    this.loadTemplate()
      .then(() => this.loadThemes()
        .then(() => {
          this.render();
          this.registerEvents();
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

  render() {
    super.render();

    this.ulRoot = this.shadow.querySelector('#treeview-list');
    this.optionsButton = this.shadow.querySelector('#options');
    this.toggleLegendsButton = this.shadow.querySelector('#togglelegends');
    this.expandAllButton = this.shadow.querySelector('#expandall');
    this.swipeButton = this.shadow.querySelector('#swipe');
    this.deleteButton = this.shadow.querySelector('#delete');
  }

  renderChilds(container, elem, parentServer) {
    // Add new sub-list
    const ulChild = document.createElement('ul');
    ulChild.style.display = 'none';
    container.appendChild(ulChild);
    elem.children.forEach(child => {
      this.renderLeaf(ulChild, child, parentServer);
    });
  }

  renderLeaf(ulParent, elem, parentServer) {
    // Create new leaf
    const li = document.createElement('li');
    ulParent.appendChild(li);

    //Create container div
    const container = document.createElement('div');
    li.appendChild(container);

    // If a server is defined on this node, we use it.
    // Otherwise, we use the server of the parent
    const childServer = (elem.ogcServer) ? elem.ogcServer : parentServer;

    // Create Layer
    const layer = this.createLayer(elem, childServer);
    li.dataset.layerid = layer.id;

    // Add icons
    this.renderLeafIcons(container, layer);
    // Add label
    this.renderLeafLabel(container, layer);
    
    // Append childs if any
    if (elem.children !== undefined) {
      this.renderChilds(container, elem, childServer);
    }
  }

  createLayer(elem, server) {
      let url = null;
      if (elem.type === 'WMS') {
        // WMS Case: there must be an OGC-Server
        if (server) {
          url = this.servers[server].url
        }
        else {
          console.log('No OGC server found for layer ' + elem.name);
        }
      }
      else if (elem.type === 'WMTS') {
        // WMTS Case: we take the URL of Capabilities
        url = elem.url;
      }

      const layer = new Layer(elem, server, url);
      this.layers.push(layer);

      // The id is the index of the layer in the layer list
      layer.id = this.layers.length - 1;
      layer.order = layer.id;
      return layer;
  }

  renderDeleteIcon(li, layer) {
    const del = document.createElement('i');
    del.className = 'fa fa-solid fa-xmark tool selectable del';
    del.setAttribute('tip', 'Remove this group');
    del.onclick = (e) => this.deleteLayer(this, layer, e);
    li.append(del);
  }

  renderLeafIcons(container, layer) {
    // This function returns true if a placeholder for a whole legend mut be added
    // False is not placeholder is needed
    if (layer.isGroup) {
      // We are not on a child layer
      // => Add caret
      const caret = document.createElement('i');
      caret.className = 'fa fa-caret-right selectable expand';
      caret.onclick = (e) => this.expand(this, e);
      container.append(caret);
      // Add selection icon
      this.renderSelectionCircle(container);
      // Add delete icon
      this.renderDeleteIcon(container, layer);
    }
    else {
      // We are on a child
      // => Add spacer (replaces the caret)
      const spacer = document.createElement('i');
      spacer.className = 'spacer';
      container.append(spacer);

      // => Add iconUrl if any
      if (layer.iconUrl) {
        // A custom Legend icon has been defined.
        // => We just use it
        const icon = document.createElement('img');
        icon.src = layer.iconUrl;
        icon.className = 'iconurl';
        container.append(icon);
      }
      else if (layer.hasLegend) {
        // A whole legend needs to be display.
        // => We add a legend button and the legend circle
        this.renderSelectionCircle(container)

        // Add icon for legend toggle
        const legend = document.createElement('i');
        //legend.className = 'fg-map-legend tool selectable';
        legend.className = 'fa-solid fa-bars tool selectable legend';
        legend.setAttribute('tip', 'Toggle legend');
        legend.onclick = () => this.toggleLegend(this, layer.legendId);
        container.append(legend);
      }
      else if (layer.isWms){
        // Last case :
        // We need to get the legendicon URL from openlayer
        // before we can show the legend icon
        const icon = document.createElement('img');
        icon.id = layer.legendId;
        icon.className = 'iconurl';
        container.append(icon);

        this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'requestLegendUrl', layer: layer});
      }

      // If we didn't add any icon for legend, we add a spacer
      if (!layer.hasLegend) {
        const legendSpacer = document.createElement('i');
        legendSpacer.className = 'tool spacer';
        container.append(legendSpacer);
      }

      // Add an icon to control the layer opacity
      const opacity = document.createElement('i');
      opacity.className = 'fa-regular fa-sun tool selectable advanced opacity';
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
      container.append(opacity);

      // On the childs, we can have a icon to zoom to the right resolution, where the layer will be visible
      if (layer.hasRestrictedResolution()) {
        const resolutionZoom = document.createElement('i');
        resolutionZoom.className = 'fg-zoom-in tool selectable zoomres';
        resolutionZoom.setAttribute('tip', 'Zoom to visible resolution');
        resolutionZoom.onclick = (e) => this.zoomToResolution(layer.minResolution, layer.maxResolution);
        container.append(resolutionZoom);
      }
    }
  }

  deleteLayer(_this, layer, e) {
    const li = this.getParentLi(e.target);

    // First deactivate layer
    if (layer.isGroup) {
      const toggledLayers = this.toggleChilds(li, false);
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: 'layerListDisabled', layerList: toggledLayers});
    }

    // Then set the value in the list to null
    // Caution : do not filter the list to remove the layer from it, 
    // because the position in the list is the id of the layer
    // and is used as reference in the TreeView
    // TODO REG: change this because this can lead to errors
    const index = this.layers.indexOf(layer);
    this.layers[index] = null;

    // Then remove element from treeview
    li.remove();
  }

  deleteAllLayers() {
    this.ulRoot.innerHTML = '';
    this.layers = [];
  }

  changeOpacity(layer, reference, e) {
    layer.opacity = e.target.value/20;
    if (layer.isTransparent) {
      reference.classList.remove('fa-regular');
      reference.classList.add('fa-solid');
      reference.classList.add('active');
    }
    else {
      reference.classList.remove('fa-solid');
      reference.classList.add('fa-regular');
      reference.classList.remove('active');
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

  toggleLegend(_this, legendId, force=false, visible=false) {
    const legend = _this.shadow.querySelector('#' + legendId);
    if (force && visible) {
      legend.style.display = 'block';
    }
    else if (force && !visible) {
      legend.style.display = 'none';
    }
    else if (legend.style.display === 'none') {
      legend.style.display = 'block';
    }
    else {
      legend.style.display = 'none';
    }
  }
  
  renderLeafLabel(container, layer) {
    // Add label
    const span = document.createElement('span');
    span.setAttribute('i18n', layer.name);
    span.className = 'selectable';
    span.onclick = (e) => this.toggle(this, e, layer);
    container.appendChild(span);

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
    const li = this.getParentLi(e.target);
    const ulChild = li.getElementsByTagName('ul')[0];
    if (ulChild.style.display === 'none') {
      ulChild.style.display = 'block';
      e.target.classList.remove('fa-caret-right');
      e.target.classList.add('fa-caret-down');
    }
    else {
      ulChild.style.display = 'none';
      e.target.classList.remove('fa-caret-down');
      e.target.classList.add('fa-caret-right');
    }
  }

  expandAllLayers() {
    const uls = this.ulRoot.getElementsByTagName('ul');
    for (let i=0; i<uls.length; i++) {
      const ul = uls[i];
      if (this.allLayersExpanded) {
        // Collapse
        ul.style.display = 'none';
      }
      else {
        // Expand
        ul.style.display = 'block';
      }
    }

    // Change caret icons
    let oldStyle = 'fa-caret-right';
    let newStyle = 'fa-caret-down';
    if (this.allLayersExpanded) {
      oldStyle = 'fa-caret-down';
      newStyle = 'fa-caret-right';
    }
    const carets = this.ulRoot.querySelectorAll('.' + oldStyle);
    for (let i=0; i<carets.length; i++) {
      const caret = carets[i];
      console.log(i);
      console.log(caret);
      console.log(oldStyle);
      console.log(newStyle);
      caret.classList.remove(oldStyle);
      caret.classList.add(newStyle);
    }

    this.allLayersExpanded = !this.allLayersExpanded;
  }

  toggle(_this, e, layer) {
    const li = this.getParentLi(e.target);

    const setActive = !(layer.active);
    this.toggleLeaf(li, layer, setActive);

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
      const action = (layer.active) ? 'layerEnabled' : 'layerDisabled';
      this.messageManager.sendMessage(GeoEvents.TreeView, {action: action, layer: layer});
    }
  }

  toggleLeaf(li, layer, setActive) {
    const circle = li.querySelector('[data-circle="true"]');

    layer.active = setActive;
    if (setActive) {
      li.className = 'active';
      this.toggleSelectionCircle(circle, true);
    }
    else {
      li.className = '';
      this.toggleSelectionCircle(circle, false);
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
      const layer = this.layers[childLi.dataset.layerid];
      if ((setActive && !layer.active) || (!setActive && !layer.inactive)) {
        //The layer is not in the right state yet.
        this.toggleLeaf(childLi, layer, setActive);
        if (layer.isLayer) {
          toggledLayers.push(layer);
        }
      }
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
      const childLi = childLis[i];
      const layer = this.layers[childLi.dataset.layerid];
      if (layer.active) {
        allInactive = false;
      }
      else if (layer.inactive) {
        allActive = false;
      }
      else {
        // layer is semi-active
        allActive = false;
        allInactive = false;
      }
    }

    const liParent = this.getParentLi(ul);
    const layerParent = this.layers[liParent.dataset.layerid];
    const circle = liParent.getElementsByTagName('i')[1];
    
    let stateChanged = false;
    if (allActive && !layerParent.active) {
      // Activate parent
      layerParent.active = true;
      liParent.className = 'active';
      this.toggleSelectionCircle(circle, true);
      stateChanged = true;
    }
    else if (allInactive && !layerParent.inactive) {
      // Deactivate parent
      layerParent.active = false;
      liParent.className = '';
      this.toggleSelectionCircle(circle, false);
      stateChanged = true;
    }
    else if (!layerParent.semiactive) {
      // Semi-active
      layerParent.active = 'semi';
      liParent.className = '';
      this.toggleSelectionCircle(circle, 'semi');

      stateChanged = true;
    }

    if (stateChanged) {
      // Recursively call on parent
      this.toggleParent(liParent);
    }
  }

  renderSelectionCircle(li) {
    const circle = document.createElement('i');
    circle.dataset.circle = true;
    circle.className = 'fa-xs fa-regular fa-circle selcircle';
    li.append(circle);
  }

  toggleSelectionCircle(circle, active) {
    // active can have the values true, false or 'semi'
    if (this.isNullOrUndefined(circle)) {
      // Circle does no exist. Just stop here
      return;
    }

    if (active === true) {
      circle.className = 'fa-xs fa-solid fa-circle selcircle';
    }
    else if (active === false) {
      circle.className = 'fa-xs fa-regular fa-circle selcircle';
    }
    else if (active === 'semi') {
      circle.className = 'fa-xs fa-solid fa-circle-half-stroke selcircle';
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
    // Clear existing TreeView
    this.deleteAllLayers();

    // Add the current theme
    theme.children.forEach(elem => {
      this.renderLeaf(this.ulRoot, elem, null);
    });

    // Some objects needs to be added at the end of the rendering, 
    // because they use the siblings fo their configuration (visibility)
    this.postRender();

    this.activateTooltips(false, [800, 0], 'right');

    I18nManager.getInstance().translate(this.shadow);
  }

  postRender() {
    const lis = this.ulRoot.getElementsByTagName('li');
    for (let i=0; i<lis.length; i++) {
      const li = lis[i];
      const layer = this.layers[li.dataset.layerid];
      if (layer.isLayer) {
        this.renderMoveIcons(li, layer);
        if (layer.hasLegend) {
          this.renderLegend(li, layer);
        }
      }
    }
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

  renderMoveIcons(li, layer) {

    const container = li.getElementsByTagName('div')[0];

    // Add move down
    const movedown = document.createElement('i');
    movedown.className = 'fa-solid fa-caret-down advanced tool selectable movedown';
    movedown.setAttribute('tip', 'Move this layer down');
    movedown.onclick = (e) => this.moveLayerDown(this, layer, e);
    container.append(movedown);
    // But hide it if we are on the last node
    if (this.isNullOrUndefined(li.nextElementSibling) || li.nextElementSibling.nodeName !== 'LI') {
      movedown.style.visibility = 'hidden';
    }

    // Add move up 
    const moveup = document.createElement('i');
    moveup.className = 'fa-solid fa-caret-up advanced tool selectable moveup';
    moveup.setAttribute('tip', 'Move this layer up');
    moveup.onclick = (e) => this.moveLayerUp(this, layer, e);
    container.append(moveup);
    // But hide it if we are on the first node
    if (this.isNullOrUndefined(li.previousElementSibling) || li.previousElementSibling.nodeName !== 'LI') {
      moveup.style.visibility = 'hidden';
    }
  }

  moveLayerUp(_this, layer, e) {
    const li = this.getParentLi(e.target);
    const previousLi = li.previousElementSibling;
    const previousLayer = _this.layers[previousLi.dataset.layerid];
    
    // Switch order values
    const previousOrder = previousLayer.order;
    previousLayer.order = layer.order;
    layer.order = previousOrder;

    // Invert layers in treeview
    const ul = li.parentElement;
    ul.insertBefore(li, previousLi);

    // Show or hide moveup and movedown buttons
    const limoveup = li.querySelectorAll('.moveup')[0];
    const limovedown = li.querySelectorAll('.movedown')[0];
    const previouslimoveup = previousLi.querySelectorAll('.moveup')[0];
    const previouslimovedown = previousLi.querySelectorAll('.movedown')[0];
    this.switchVisibility(limoveup, previouslimoveup);
    this.switchVisibility(limovedown, previouslimovedown);

    // Refresh Map
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'orderChanged', layers: [previousLayer, layer]});
  }

  moveLayerDown(_this, layer, e) {
    const li = this.getParentLi(e.target);
    const nextLi = li.nextElementSibling;
    const nextLayer = _this.layers[nextLi.dataset.layerid];
    
    // Switch order values
    const nextOrder = nextLayer.order;
    nextLayer.order = layer.order;
    layer.order = nextOrder;

    // Invert layers in treeview
    const ul = li.parentElement;
    ul.insertBefore(nextLi, li);

    // Show or hide moveup and movedown buttons
    const limoveup = li.querySelectorAll('.moveup')[0];
    const limovedown = li.querySelectorAll('.movedown')[0];
    const nextlimoveup = nextLi.querySelectorAll('.moveup')[0];
    const pnextlimovedown = nextLi.querySelectorAll('.movedown')[0];
    this.switchVisibility(limoveup, nextlimoveup);
    this.switchVisibility(limovedown, pnextlimovedown);

    // Refresh Map
    this.messageManager.sendMessage(GeoEvents.Map, {action: 'orderChanged', layers: [nextLayer, layer]});
  }

  switchVisibility(obj1, obj2) {
    const temp = obj1.style.visibility;
    obj1.style.visibility = obj2.style.visibility;
    obj2.style.visibility = temp;
  }

  toggleAdvancedOptions(e) {
    this.advanced = !this.advanced;
    if (this.advanced) {
      e.target.classList.add('selected');
      this.ulRoot.classList.add('advanced');
    }
    else {
      e.target.classList.remove('selected');
      this.ulRoot.classList.remove('advanced');
    }
  }

  toggleAllLegends(_this) {
    _this.layers.forEach(l => {
      if (l.hasLegend) {
        if (_this.allLegendsDisplayed) {
          // Hide
          _this.toggleLegend(_this, l.legendId, true, false);
        }
        else {
          /// Show
          _this.toggleLegend(_this, l.legendId, true, true);
        }
      }
    });

    _this.allLegendsDisplayed = !_this.allLegendsDisplayed;
  }

  getParentLi(elem) {
    const parent = elem.parentElement;
    if (parent.nodeName === 'LI') {
      return parent;
    }

    return this.getParentLi(parent);
  }
}

customElements.define('girafe-tree-view', TreeViewComponent);

export default TreeViewComponent;
