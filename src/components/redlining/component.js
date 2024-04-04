import GeoEvents from '../../models/events';
import Picker from 'vanilla-picker/csp';
import RedliningFeature from './redliningFeature';
import RedliningShape from './redliningshape';
import OlRedlining from './olRedlining';
import CesiumRedlining from './cesiumRedlining';

import { GirafeHTMLElement } from '../../base/main';

class RedliningComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  visible = false;
  eventsCallbacks = [];

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

  olRedlining = undefined;
  cesiumRedlining = undefined;

  constructor() {
    super('redlining');
    this.state.extendedState.redlining = {
      activeTool: null,
      features: []
    };
    this.olRedlining = new OlRedlining();
    this.cesiumRedlining = new CesiumRedlining();
  }

  render() {
    this.visible ? this.renderComponent() : this.renderEmptyComponent();
  }

  renderComponent() {
    super.render();
    super.girafeTranslate();
    this.activateTooltips(false, [800, 0], 'top-end');

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

    this.registerEvents();
  }

  renderEmptyComponent() {
    this.unregisterEvents();
    this.renderEmpty();
  }

  registerVisibilityEvents() {
    this.stateManager.subscribe('interface.redliningPanelVisible', (_oldValue, newValue) => this.togglePanel(newValue));
  }

  serialize() {
    return this.state.extendedState.redlining.features.map((feature) => feature.serialize());
  }

  deserialize(serializedFeatures) {
    serializedFeatures.forEach((serializedFeature) => {
      const feature = RedliningFeature.deserialize(serializedFeature);
      this.addFeature(feature);
    });
  }

  addFeature(feature) {
    // Currently, as we are using olCesium, feature are automatically replicated to Cesium
    if (this.olRedlining != undefined) {
      this.olRedlining.addFeature(feature);
    }
  }

  registerEvents() {
    this.eventsCallbacks.push(
      this.stateManager.subscribe('extendedState.redlining.features', (oldFeatures, newFeatures) =>
        this.onFeaturesChanged(oldFeatures, newFeatures)
      )
    );
    this.disableButton.addEventListener('click', (e) => this.deactivateDraw(e));
    this.pointButton.addEventListener('click', (e) => this.activateDraw(e, RedliningShape.Point));
    this.lineButton.addEventListener('click', (e) => this.activateDraw(e, RedliningShape.Polyline));
    this.squareButton.addEventListener('click', (e) => this.activateDraw(e, RedliningShape.Square));
    this.rectangleButton.addEventListener('click', (e) => this.activateDraw(e, RedliningShape.Rectangle));
    this.polygonButton.addEventListener('click', (e) => this.activateDraw(e, RedliningShape.Polygon));
    this.circleButton.addEventListener('click', (e) => this.activateDraw(e, RedliningShape.Disk));
    this.freelineButton.addEventListener('click', (e) => this.activateDraw(e, RedliningShape.FreehandPolyline));
    this.freepolygonButton.addEventListener('click', (e) => this.activateDraw(e, RedliningShape.FreehandPolygon));
    this.undoButton.addEventListener('click', () => this.messageManager.sendMessage({ action: GeoEvents.undoDraw }));
  }

  unregisterEvents() {
    this.stateManager.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
    this.disableButton?.removeEventListener('click', (e) => this.deactivateDraw(e));
    this.pointButton?.removeEventListener('click', (e) => this.activateDraw(e, 'Point'));
    this.lineButton?.removeEventListener('click', (e) => this.activateDraw(e, 'LineString'));
    this.squareButton?.removeEventListener('click', (e) => this.activateDraw(e, 'Square'));
    this.rectangleButton?.removeEventListener('click', (e) => this.activateDraw(e, 'Rectangle'));
    this.polygonButton?.removeEventListener('click', (e) => this.activateDraw(e, 'Polygon'));
    this.circleButton?.removeEventListener('click', (e) => this.activateDraw(e, 'Circle'));
    this.freelineButton?.removeEventListener('click', (e) => this.activateDraw(e, 'Freeline'));
    this.freepolygonButton?.removeEventListener('click', (e) => this.activateDraw(e, 'Freepolygon'));
    this.undoButton?.removeEventListener('click', () =>
      this.messageManager.sendMessage({ action: GeoEvents.undoDraw })
    );
  }

  activateDraw(e, tool) {
    if (this.toolSelected !== null) {
      this.toolSelected.className = '';
    }
    this.toolSelected = e.target.parentElement;
    this.toolSelected.className = 'selected';

    this.state.extendedState.redlining.activeTool = tool;
  }

  deactivateDraw(e) {
    if (this.toolSelected !== null) {
      this.toolSelected.className = '';
    }
    this.toolSelected = e.target.parentElement;
    this.toolSelected.className = 'selected';

    this.state.extendedState.redlining.activeTool = null;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerVisibilityEvents();
    });
  }

  togglePanel(visible) {
    this.visible = visible;
    this.render();
  }

  onFeaturesChanged(oldFeatures, newFeatures) {
    oldFeatures = oldFeatures ?? [];
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
      const changedFeature = this.state.extendedState.redlining.features.find((f) => f.id === feature.id);
      changedFeature.name = e.target.value;
    };
    container.appendChild(nameinput);

    // Label options
    const textdiv = document.createElement('div');
    textdiv.className = 'text-opts';

    const textminus = document.createElement('i');
    textminus.className = 'fa-solid fa-minus';
    textminus.onclick = () => {
      const changedFeature = this.state.extendedState.redlining.features.find((f) => f.id === feature.id);
      changedFeature.textSize = changedFeature.textSize - 1;
    };
    textdiv.appendChild(textminus);

    const textplus = document.createElement('i');
    textplus.className = 'fa-solid fa-plus';
    textplus.onclick = () => {
      const changedFeature = this.state.extendedState.redlining.features.find((f) => f.id === feature.id);
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
      const changedFeature = this.state.extendedState.redlining.features.find((f) => f.id === feature.id);
      changedFeature.fillColor = color.hex;
    };
    fillPicker.onDone = (color) => {
      const changedFeature = this.state.extendedState.redlining.features.find((f) => f.id === feature.id);
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
      const changedFeature = this.state.extendedState.redlining.features.find((f) => f.id === feature.id);
      changedFeature.strokeColor = color.hex;
    };
    strokePicker.onDone = (color) => {
      const changedFeature = this.state.extendedState.redlining.features.find((f) => f.id === feature.id);
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
      const changedFeature = this.state.extendedState.redlining.features.find((f) => f.id === feature.id);
      changedFeature.strokeWidth = e.target.value;
    };
    container.appendChild(slider);

    // Trash
    const trash = document.createElement('i');
    trash.className = 'fa-solid fa-trash';
    trash.onclick = (_) => this.deleteFeature(feature);
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
      this.state.extendedState.redlining.features = this.state.extendedState.redlining.features.filter((f) => {
        return f.id != feature.id;
      });
    }
  }
}

export default RedliningComponent;
