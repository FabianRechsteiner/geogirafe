import GeoEvents from '/models/events';
//import GirafeDraggableElement from '/base/GirafeDraggableElement';
import GirafeResizableElement from '/base/GirafeResizableElement';
import Picker from 'vanilla-picker/csp';

class RedliningComponent extends GirafeResizableElement {

  panel = null
  disableButton = null;
  pointButton = null;
  lineButton = null;
  squareButton = null;
  rectangleButton = null;
  polygonButton = null;
  circleButton = null;
  freelineButton = null;
  freepolygonButton = null;
  undoButton = null;

  toolSelected = null;

  drawingList = null;
  
  constructor() {
    super('redlining');
  }

  render() {
    super.render();

    // Bar is hidden per default
    this.panel = this.shadow.querySelector('#panel');
    this.panel.style.display = 'none';

    this.disableButton = this.shadow.querySelector('#disable');
    this.pointButton = this.shadow.querySelector('#point');
    this.lineButton = this.shadow.querySelector('#line');
    this.squareButton = this.shadow.querySelector('#square');
    this.rectangleButton = this.shadow.querySelector('#rectangle');
    this.polygonButton = this.shadow.querySelector('#polygon');
    this.circleButton = this.shadow.querySelector('#circle');
    this.freelineButton = this.shadow.querySelector('#freeline');
    this.freepolygonButton = this.shadow.querySelector('#freepolygon');
    this.undoButton = this.shadow.querySelector('#undo');

    this.drawingList = this.shadow.querySelector('#drawingList');

    this.toolSelected = this.disableButton;

    this.activateTooltips(false, [800, 0], 'top-end');
  }

  registerEvents() {
    window.addEventListener(GeoEvents.Redlining, (e) => this.onRedliningEvent(e.detail));

    this.disableButton.addEventListener('click', (e) => this.deactivateDraw(e));
    this.pointButton.addEventListener('click', (e) => this.activateDraw(e, 'Point'));
    this.lineButton.addEventListener('click', (e) => this.activateDraw(e, 'LineString'));
    this.squareButton.addEventListener('click', (e) => this.activateDraw(e, 'Square'));
    this.rectangleButton.addEventListener('click', (e) => this.activateDraw(e, 'Rectangle'));
    this.polygonButton.addEventListener('click', (e) => this.activateDraw(e, 'Polygon'));
    this.circleButton.addEventListener('click', (e) => this.activateDraw(e, 'Circle'));
    this.freelineButton.addEventListener('click', (e) => this.activateDraw(e, 'Freeline'));
    this.freepolygonButton.addEventListener('click', (e) => this.activateDraw(e, 'Freepolygon'));
    this.undoButton.addEventListener('click', () => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'undoDraw'}));
  }

  activateDraw(e, tool) {
    if (this.toolSelected !== null) {
      this.toolSelected.className = '';
    }
    this.toolSelected = e.target.parentElement;
    this.toolSelected.className = 'selected';

    this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'drawToolActivated', tool: tool});
  }

  deactivateDraw(e) {
    if (this.toolSelected !== null) {
      this.toolSelected.className = '';
    }
    this.toolSelected = e.target.parentElement;
    this.toolSelected.className = 'selected';

    this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'drawToolDeactivated'});
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
    const nameinput = document.createElement('input');
    nameinput.type = 'text';
    nameinput.value = name;
    nameinput.className = 'name';
    nameinput.oninput = (e) => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'nameChanging', id:id, name: e.target.value});
    container.appendChild(nameinput);

    // Label options
    const textdiv = document.createElement('div');
    textdiv.className = 'text-opts';

    const textminus = document.createElement('i');
    textminus.className = 'fa-solid fa-minus';
    textminus.onclick = (e) => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'styleChanging', id:id, text: 'textsmaller'});
    textdiv.appendChild(textminus);

    const textplus = document.createElement('i');
    textplus.className = 'fa-solid fa-plus';
    textplus.onclick = (e) => this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'styleChanging', id:id, text: 'textbigger'});
    textdiv.appendChild(textplus);

    container.appendChild(textdiv);

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
    if (confirm('Do you want to delete this feature?')) {
      this.messageManager.sendMessage(GeoEvents.Redlining, {action: 'deleteFeature', id: id});
    }
  }
}

customElements.define('girafe-redlining', RedliningComponent);

export default RedliningComponent;