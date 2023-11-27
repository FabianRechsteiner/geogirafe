import GeoEvents from '../../models/events';
import GirafeResizableElement from '../../base/GirafeResizableElement';
import Picker from 'vanilla-picker/csp';

class RedliningComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  panel = null;
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
    this.stateManager.subscribe('interface.redliningPanelVisible', (oldValue, newValue) => this.togglePanel(newValue));
    this.stateManager.subscribe('redlining.features', (oldFeatures, newFeatures) =>
      this.onFeaturesChanged(oldFeatures, newFeatures)
    );

    this.disableButton.addEventListener('click', (e) => this.deactivateDraw(e));
    this.pointButton.addEventListener('click', (e) => this.activateDraw(e, 'Point'));
    this.lineButton.addEventListener('click', (e) => this.activateDraw(e, 'LineString'));
    this.squareButton.addEventListener('click', (e) => this.activateDraw(e, 'Square'));
    this.rectangleButton.addEventListener('click', (e) => this.activateDraw(e, 'Rectangle'));
    this.polygonButton.addEventListener('click', (e) => this.activateDraw(e, 'Polygon'));
    this.circleButton.addEventListener('click', (e) => this.activateDraw(e, 'Circle'));
    this.freelineButton.addEventListener('click', (e) => this.activateDraw(e, 'Freeline'));
    this.freepolygonButton.addEventListener('click', (e) => this.activateDraw(e, 'Freepolygon'));
    this.undoButton.addEventListener('click', () => this.messageManager.sendMessage({ action: GeoEvents.undoDraw }));
  }

  activateDraw(e, tool) {
    if (this.toolSelected !== null) {
      this.toolSelected.className = '';
    }
    this.toolSelected = e.target.parentElement;
    this.toolSelected.className = 'selected';

    this.state.redlining.activeTool = tool;
  }

  deactivateDraw(e) {
    if (this.toolSelected !== null) {
      this.toolSelected.className = '';
    }
    this.toolSelected = e.target.parentElement;
    this.toolSelected.className = 'selected';

    this.state.redlining.activeTool = null;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }

  closePanel() {
    this.state.interface.redliningPanelVisible = false;
  }

  togglePanel(visible) {
    if (visible) {
      this.panel.style.display = 'block';
      this.panel.getRootNode().host.style.display = 'block';
    } else {
      this.panel.style.display = 'none';
      this.panel.getRootNode().host.style.display = 'none';
    }
  }

  onFeaturesChanged(oldFeatures, newFeatures) {
    const deletedFeatures = oldFeatures.filter(
      (oldFeature) => !newFeatures.find((newFeature) => newFeature.id === oldFeature.id)
    );
    const addedFeatures = newFeatures.filter(
      (newFeature) => !oldFeatures.find((oldFeature) => oldFeature.id === newFeature.id)
    );

    deletedFeatures.forEach((feature) => {
      this.removeFeatureFromList(feature);
    });

    addedFeatures.forEach((feature) => {
      this.addFeatureToList(feature);
    });
  }

  addFeatureToList(feature) {
    const elementId = 'f-' + feature.id;
    const container = document.createElement('div');
    container.className = 'girafe';
    container.id = elementId;

    // Label
    const nameinput = document.createElement('input');
    nameinput.type = 'text';
    nameinput.value = feature.name;
    nameinput.className = 'name';
    nameinput.oninput = (e) => {
      const changedFeature = this.state.redlining.features.find((f) => f.id === feature.id);
      changedFeature.name = e.target.value;
    };
    container.appendChild(nameinput);

    // Label options
    const textdiv = document.createElement('div');
    textdiv.className = 'text-opts';

    const textminus = document.createElement('i');
    textminus.className = 'fa-solid fa-minus';
    textminus.onclick = () => {
      const changedFeature = this.state.redlining.features.find((f) => f.id === feature.id);
      changedFeature.textSize = changedFeature.textSize - 1;
    };
    textdiv.appendChild(textminus);

    const textplus = document.createElement('i');
    textplus.className = 'fa-solid fa-plus';
    textplus.onclick = () => {
      const changedFeature = this.state.redlining.features.find((f) => f.id === feature.id);
      changedFeature.textSize = changedFeature.textSize + 1;
    };
    textdiv.appendChild(textplus);

    container.appendChild(textdiv);

    // Color Selector (Fill)
    const fill = document.createElement('i');
    fill.className = 'fa-solid fa-paint-roller';
    container.appendChild(fill);
    const fillColor = this.isNullOrUndefined(feature.fillColor)
      ? this.configManager.Config.redlining.defaultFillColor
      : feature.fillColor;
    const fillPicker = new Picker({ parent: fill, color: fillColor, popup: 'left' });
    // Message when color changed
    fillPicker.onChange = (color) => {
      const changedFeature = this.state.redlining.features.find((f) => f.id === feature.id);
      changedFeature.fillColor = color.hex;
    };
    fillPicker.onDone = (color) => {
      const changedFeature = this.state.redlining.features.find((f) => f.id === feature.id);
      changedFeature.fillColor = color.hex;
    };

    // Color Selector (Stroke)
    const stroke = document.createElement('i');
    stroke.className = 'fa-solid fa-paintbrush';
    container.appendChild(stroke);
    const strokeColor = this.isNullOrUndefined(feature.strokeColor)
      ? this.configManager.Config.redlining.defaultStrokeColor
      : feature.fillColor;
    const strokePicker = new Picker({ parent: stroke, color: strokeColor, popup: 'left' });
    // Message when color changed
    strokePicker.onChange = (color) => {
      const changedFeature = this.state.redlining.features.find((f) => f.id === feature.id);
      changedFeature.strokeColor = color.hex;
    };
    strokePicker.onDone = (color) => {
      const changedFeature = this.state.redlining.features.find((f) => f.id === feature.id);
      changedFeature.strokeColor = color.hex;
    };

    // StrokeWidth slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider';
    slider.min = 0;
    slider.max = 10;
    slider.value = this.isNullOrUndefined(feature.strokeWidth)
      ? this.configManager.Config.redlining.defaultStrokeWidth
      : feature.strokeWidth;
    slider.oninput = (e) => {
      const changedFeature = this.state.redlining.features.find((f) => f.id === feature.id);
      changedFeature.strokeWidth = e.target.value;
    };
    container.appendChild(slider);

    // Trash
    const trash = document.createElement('i');
    trash.className = 'fa-solid fa-trash';
    trash.onclick = (e) => this.deleteFeature(feature);
    container.appendChild(trash);

    this.drawingList.appendChild(container);
  }

  removeFeatureFromList(feature) {
    const elementId = 'f-' + feature.id;
    const divToRemove = this.shadow.getElementById(elementId);
    divToRemove.remove();
  }

  deleteFeature(feature) {
    if (confirm('Do you want to delete this feature?')) {
      this.state.redlining.features = this.state.redlining.features.filter((f) => {
        return f.id != feature.id;
      });
    }
  }
}

export default RedliningComponent;
