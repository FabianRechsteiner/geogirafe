import GeoEvents from '/models/events';
//import GirafeDraggableElement from '/base/GirafeDraggableElement';
import GirafeResizableElement from '/base/GirafeResizableElement';
import Picker from 'vanilla-picker/csp';

class RedliningComponent extends GirafeResizableElement {

  static #template = null;

  panel = null
  pointButton = null;
  lineButton = null;
  squareButton = null;
  rectangleButton = null;
  polygonButton = null;
  circleButton = null;
  freeButton = null;

  drawingList = null;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({mode: 'open'});
  }

  async loadTemplate() {
    if (RedliningComponent.#template !== null) {
      // Template was already loaded. Nothing to do.
      return;
    }
    // Otherwise, load the template
    const response = await fetch('/components/redlining/template.html');
    const content = await response.text();
    RedliningComponent.#template = document.createElement('template');
    RedliningComponent.#template.innerHTML = content;
  }

  render() {
    // Clone component template and add it to the dom
    this.shadow.appendChild(RedliningComponent.#template.content.cloneNode(true));

    // Bar is hidden per default
    this.panel = this.shadow.querySelector('#panel');
    this.panel.style.display = 'none';

    this.pointButton = this.shadow.querySelector('#point');
    this.lineButton = this.shadow.querySelector('#line');
    this.squareButton = this.shadow.querySelector('#square');
    this.rectangleButton = this.shadow.querySelector('#rectangle');
    this.polygonButton = this.shadow.querySelector('#polygon');
    this.circleButton = this.shadow.querySelector('#circle');
    this.freeButton = this.shadow.querySelector('#free');

    this.drawingList = this.shadow.querySelector('#drawingList');

    this.makeResizable();
    this.activateTooltips();
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Redlining, (e) => this.onRedliningEvent(e.detail));

    this.pointButton.addEventListener('click', (e) => this.activateDraw('Point'));
    this.lineButton.addEventListener('click', (e) => this.activateDraw('LineString'));
    this.squareButton.addEventListener('click', (e) => this.activateDraw('Square'));
    this.rectangleButton.addEventListener('click', (e) => this.activateDraw('Rectangle'));
    this.polygonButton.addEventListener('click', (e) => this.activateDraw('Polygon'));
    this.circleButton.addEventListener('click', (e) => this.activateDraw('Circle'));
    this.freeButton.addEventListener('click', (e) => this.activateDraw('Free'));
  }

  activateDraw(tool) {
    this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'drawToolActivated', tool: tool});
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.render();
      this.registerEvents();
    });
  }

  onRedliningEvent(details) {
    if (details.action === 'redliningToggled') {
      if (this.panel.style.display == 'block') {
        this.panel.style.display = 'none';
        this.panel.getRootNode().host.style.display = 'none';
      }
      else {
        this.panel.style.display = 'block';
        this.panel.getRootNode().host.style.display = 'block';
      }
    }
    else if (details.action === 'featureAdded') {
      this.addFeatureToList(details.id, details.name, details.fillColor, details.strokeColor, details.strokeWidth);
    }
    else if (details.action === 'featureRemoved') {
      this.removeFeatureFromList(details.id);
    }
  }

  addFeatureToList(id, name, fillColor, strokeColor, strokeWidth) {

    const elementId = 'f-' + id;
    const container = document.createElement('div');
    container.className = 'girafe';
    container.id = elementId;

    // Label
    const span = document.createElement('span');
    span.textContent = name;
    span.className = 'girafe';
    container.appendChild(span);

    // Color Selector (Fill)
    const fill = document.createElement('i');
    fill.className = 'fa-solid fa-paint-roller';
    container.appendChild(fill);
    const fillPicker = new Picker({parent: fill, color: fillColor, popup: 'left'});
    // Message when color changed
    fillPicker.onChange = (color) => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'styleChanging', id:id, fillColor: color});
    fillPicker.onDone = (color) => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'styleChanging', id:id, fillColor: color});

    // Color Selector (Stroke)
    const stroke = document.createElement('i');
    stroke.className = 'fa-solid fa-paintbrush';
    container.appendChild(stroke);
    const strokePicker = new Picker({parent: stroke, color: strokeColor, popup: 'left'});
    // Message when color changed
    strokePicker.onChange = (color) => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'styleChanging', id:id, strokeColor: color});
    strokePicker.onDone = (color) => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'styleChanging', id:id, strokeColor: color});

    // StrokeWidth slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider';
    slider.min = 0;
    slider.max = 10;
    slider.value = strokeWidth;
    slider.oninput = (e) => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'styleChanging', id:id, strokeWidth: e.target.value});
    container.appendChild(slider);

    // Trash
    const trash = document.createElement('i');
    trash.className = 'fa-solid fa-trash';
    trash.onclick = (e) => this.deleteFeature(id);
    container.appendChild(trash);

    this.drawingList.appendChild(container);
  }

  removeFeatureFromList(id) {
    const elementId = 'f-' + id;
    const divToRemove = this.shadow.getElementById(elementId);
    divToRemove.remove();
  }

  deleteFeature(id) {
    this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'deleteFeature', id: id});
  }
}

customElements.define('girafe-redlining', RedliningComponent);

export default RedliningComponent;