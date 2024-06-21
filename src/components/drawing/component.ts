import Picker, { Color } from 'vanilla-picker';
import DrawingFeature, { DrawingState, SerializedFeature } from './drawingFeature';
import DrawingShape from './drawingshape';
import OlDrawing from './olDrawing';
import CesiumDrawing from './cesiumDrawing';
import GeoJSON from 'ol/format/GeoJSON';

import GeoEvents from '../../models/events';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { Callback } from '../../tools/state/statemanager';
import MapComponent from '../map/component';

import minusIcon from './assets/minus.svg?raw';
import paintRollerIcon from './assets/paint-roller.svg?raw';
import paintBrushIcon from './assets/paintbrush.svg?raw';
import plusIcon from './assets/plus.svg?raw';
import trashIcon from './assets/trash.svg?raw';

let lastMouseX: number = 0;
let lastMouseY: number = 0;
const setLastMousePosition = (e: MouseEvent) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
};

export default class DrawingComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  visible = false;
  eventsCallbacks: Callback[] = [];
  drawingState: DrawingState;

  buttons: { elem: HTMLElement | null; selector: string; tool: DrawingShape | null }[] = [
    { elem: null, selector: '#disable', tool: null },
    { elem: null, selector: '#point', tool: DrawingShape.Point },
    { elem: null, selector: '#line', tool: DrawingShape.Polyline },
    { elem: null, selector: '#square', tool: DrawingShape.Square },
    { elem: null, selector: '#rectangle', tool: DrawingShape.Rectangle },
    { elem: null, selector: '#polygon', tool: DrawingShape.Polygon },
    { elem: null, selector: '#circle', tool: DrawingShape.Disk },
    { elem: null, selector: '#freeline', tool: DrawingShape.FreehandPolyline },
    { elem: null, selector: '#freepolygon', tool: DrawingShape.FreehandPolygon }
  ];
  undoButton: Element | null = null;
  toolSelected: Element | null = null;
  drawingList: Element | null = null;

  olDrawing: OlDrawing;
  cesiumDrawing: CesiumDrawing = new CesiumDrawing();

  constructor() {
    super('drawing');
    this.state.extendedState.drawing = new DrawingState();
    this.drawingState = this.state.extendedState.drawing as DrawingState;
    this.olDrawing = new OlDrawing(this.componentManager.getComponents(MapComponent)[0]);
  }

  render() {
    this.visible ? this.renderComponent() : this.renderEmptyComponent();
  }

  renderComponent() {
    super.render();
    super.girafeTranslate();
    this.activateTooltips(false, [800, 0], 'top-end');
    this.buttons.forEach((b) => (b.elem = this.shadow.querySelector(b.selector)));
    this.toolSelected = this.buttons[0].elem;
    this.undoButton = this.shadow.querySelector('#undo');
    this.drawingList = this.shadow.querySelector('#drawingList');
    this.state.selection.enabled = false;
    this.registerEvents();
  }

  renderEmptyComponent() {
    this.drawingState.activeTool = null;
    this.state.selection.enabled = true;
    this.unregisterEvents();
    this.renderEmpty();
  }

  registerEvents() {
    this.eventsCallbacks.push(
      this.stateManager.subscribe('extendedState.drawing.features', (olds, news) => this.onFeaturesChanged(olds, news))
    );
    this.stateManager.subscribe('projection', (olds, news) => this.onProjectionChanged(olds, news));
    this.buttons.forEach((b) => b.elem?.addEventListener('click', () => this.setTool(b.elem!, b.tool)));
    this.undoButton?.addEventListener('click', () => this.messageManager.sendMessage({ action: GeoEvents.undoDraw }));
  }

  unregisterEvents() {
    this.stateManager.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
    this.buttons.forEach((b) => b.elem?.removeEventListener('click', () => this.setTool(b.elem!, b.tool)));
    this.undoButton?.removeEventListener('click', () =>
      this.messageManager.sendMessage({ action: GeoEvents.undoDraw })
    );
  }

  registerVisibilityEvents() {
    this.stateManager.subscribe('interface.drawingPanelVisible', (_, newValue) => this.togglePanel(newValue));
  }

  serialize() {
    return this.drawingState.features.map((f) => f.serialize());
  }

  deserialize(serializedFeatures: SerializedFeature[]) {
    serializedFeatures.forEach((f) => this.drawingState.features.push(DrawingFeature.deserialize(f)));
  }

  setTool(element: HTMLElement, tool: DrawingShape | null = null) {
    if (this.toolSelected !== null) {
      this.toolSelected.className = '';
    }
    this.toolSelected = element;
    this.toolSelected.className = 'selected';
    this.drawingState.activeTool = tool;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.registerVisibilityEvents();
    });
  }

  togglePanel(visible: boolean) {
    this.visible = visible;
    this.render();
  }

  onFeaturesChanged(oldFeatures: DrawingFeature[], newFeatures: DrawingFeature[]) {
    oldFeatures = oldFeatures ?? [];
    const newIds = newFeatures.map((f) => f.id);
    const oldIds = oldFeatures.map((f) => f.id);
    const deleted = oldFeatures.filter((f) => !newIds.includes(f.id));
    const added = newFeatures.filter((f) => !oldIds.includes(f.id));
    deleted.forEach((f) => this.removeFeatureFromList(f));
    added.forEach((f) => this.addFeatureToList(f));
  }

  onProjectionChanged(oldProj: string, newProj: string) {
    const geoJson = new GeoJSON();
    let features: DrawingFeature[] = [];
    this.drawingState.features.forEach((f) => {
      // TODO Handle the case of disks
      f.geojson = geoJson.writeFeatureObject(
        geoJson.readFeature(f.geojson, { dataProjection: oldProj, featureProjection: newProj })
      );
      features.push(f);
    });
    // Refresh all the listeners
    this.drawingState.features = [];
    this.drawingState.features = features;
  }

  createDiv(id = '', className = '', content = '', onclick = (_: MouseEvent) => {}) {
    const element = document.createElement('div');
    element.id = id;
    element.className = className;
    element.innerHTML = content;
    element.onclick = onclick;
    return element;
  }

  addFeatureToList(feature: DrawingFeature) {
    const container = this.createDiv('f-' + feature.id, 'girafe');
    const lineOne = this.createDiv('', 'featureLine');
    const lineTwo = this.createDiv('', 'featureLine');

    // Label
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = feature.name;
    nameInput.className = 'name';
    nameInput.oninput = (e) => (feature.name = (e.target as HTMLInputElement).value);
    lineOne.appendChild(nameInput);

    // Label options
    lineOne.appendChild(this.createDiv('', 'icon', minusIcon, () => feature.fontSize--));
    lineOne.appendChild(this.createDiv('', 'icon', plusIcon, () => feature.fontSize++));

    // Color Selector (Fill)
    const fill = this.createDiv('', 'icon', paintRollerIcon, setLastMousePosition);
    const fillColor = feature.fillColor ?? this.configManager.Config.drawing.defaultFillColor;
    const fillPicker = new Picker({ parent: fill, color: fillColor, popup: 'left' });
    fillPicker.onChange = (color: typeof Color) => (feature.fillColor = color.hex);
    fillPicker.onDone = (color: typeof Color) => (feature.fillColor = color.hex);
    fillPicker.onOpen = () =>
      this.shadowRoot?.querySelectorAll('.picker_wrapper').forEach((e) => {
        const element = e as HTMLElement;
        if (element.style.display != 'none') {
          element.style.top = Math.min(window.innerHeight - 300, lastMouseY) + 'px';
          element.style.left = lastMouseX + 'px';
        }
      });
    lineTwo.appendChild(fill);

    // Color Selector (Stroke)
    const stroke = this.createDiv('', 'icon', paintBrushIcon, setLastMousePosition);
    const strokeColor = feature.strokeColor ?? this.configManager.Config.drawing.defaultStrokeColor;
    const strokePicker = new Picker({ parent: stroke, color: strokeColor, popup: 'left' });
    strokePicker.onChange = (color: typeof Color) => (feature.strokeColor = color.hex);
    strokePicker.onDone = (color: typeof Color) => (feature.strokeColor = color.hex);
    strokePicker.onOpen = () =>
      this.shadowRoot?.querySelectorAll('.picker_wrapper').forEach((e) => {
        const element = e as HTMLElement;
        if (element.style.display != 'none') {
          element.style.top = Math.min(window.innerHeight - 300, lastMouseY) + 'px';
          element.style.left = lastMouseX + 'px';
        }
      });
    lineTwo.appendChild(stroke);

    // StrokeWidth slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider';
    slider.min = '0';
    slider.max = '10';
    slider.value = (feature.strokeWidth ?? this.configManager.Config.drawing.defaultStrokeWidth).toString();
    slider.oninput = (e) => (feature.strokeWidth = parseInt((e.target as HTMLInputElement).value));
    lineTwo.appendChild(slider);

    // Trash
    lineTwo.appendChild(this.createDiv('', 'icon', trashIcon, () => this.deleteFeature(feature)));

    container.appendChild(lineOne);
    container.appendChild(lineTwo);
    this.drawingList?.appendChild(container);
  }

  removeFeatureFromList(feature: DrawingFeature) {
    const elementId = 'f-' + feature.id;
    const divToRemove = this.shadow.getElementById(elementId);
    if (divToRemove != null) {
      divToRemove.remove();
    } else {
      console.warn(`Tried to remove the non existing feature ${elementId}`);
    }
  }

  deleteFeature(feature: DrawingFeature) {
    if (confirm('Do you want to delete this feature ?')) {
      this.drawingState.features = this.drawingState.features.filter((f) => f.id != feature.id);
    }
  }
}
