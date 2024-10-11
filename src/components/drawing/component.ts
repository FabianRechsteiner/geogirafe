import Picker, { Color } from 'vanilla-picker';
import { v4 as uuidv4 } from 'uuid';
import DrawingFeature, { DrawingState, SerializedFeature, DrawingShape } from './drawingFeature';
import OlDrawing from './olDrawing';
import CesiumDrawing from './cesiumDrawing';

import { KML, GeoJSON, GPX } from 'ol/format';
import { Polygon } from 'ol/geom';
import Feature from 'ol/Feature';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { download } from '../../tools/export/download';
import MapComponent from '../map/component';

import trashIcon from './assets/trash.svg?raw';
import locateIcon from './assets/locate.svg?raw';
import visibleIcon from './assets/visible.svg?raw';
import notVisibleIcon from './assets/notVisible.svg?raw';

function createDiv(id = '', className = '', content = '', onclick = () => {}) {
  const element = document.createElement('div');
  element.id = id;
  element.className = className;
  element.innerHTML = content;
  element.onclick = onclick;
  return element;
}

export default class DrawingComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  visible = false;
  renderedOnce = false;
  drawingState: DrawingState;
  colorPickers: [any, () => string][] = [];

  buttons: { id: string; tool: DrawingShape | null }[] = [
    { id: 'disable', tool: null },
    { id: 'point', tool: DrawingShape.Point },
    { id: 'line', tool: DrawingShape.Polyline },
    { id: 'square', tool: DrawingShape.Square },
    { id: 'rectangle', tool: DrawingShape.Rectangle },
    { id: 'polygon', tool: DrawingShape.Polygon },
    { id: 'circle', tool: DrawingShape.Disk },
    { id: 'freeline', tool: DrawingShape.FreehandPolyline },
    { id: 'freepolygon', tool: DrawingShape.FreehandPolygon }
  ];
  toolSelected: Element | null = null;
  curFeature: DrawingFeature | null = null;

  olDrawing: OlDrawing;
  cesiumDrawing: CesiumDrawing;

  constructor() {
    super('drawing');
    this.state.extendedState.drawing = new DrawingState();
    this.drawingState = this.state.extendedState.drawing as DrawingState;
    const map = this.componentManager.getComponents(MapComponent)[0];
    this.olDrawing = new OlDrawing(map);
    this.cesiumDrawing = new CesiumDrawing(map);
    this.subscribe('extendedState.drawing.features', (olds, news) => this.onFeaturesChanged(olds, news));
    this.subscribe('projection', (olds, news) => this.onProjectionChanged(olds, news));
  }

  render() {
    super.render();
    super.girafeTranslate();
    this.activateTooltips(false, [800, 0], 'top-end');
    this.visible ? this.renderComponent() : this.hide();
    this.state.selection.enabled = !this.visible;
    this.setTool();
  }

  renderComponent() {
    this.show();
    if (!this.renderedOnce) {
      this.renderedOnce = true;
      this.buttons.forEach((b) => {
        this.getById(b.id).addEventListener('click', () => this.setTool(b.tool));
      });
      this.getById('visibleIconName').innerHTML = visibleIcon;
      this.getById('visibleIconMeasure').innerHTML = visibleIcon;
      this.addColorPicker(
        'nameColorPicker',
        (c) => (this.curFeature!.nameColor = c.hex),
        () => this.curFeature!.nameColor
      );
      this.addColorPicker(
        'measureColorPicker',
        (c) => (this.curFeature!.measureColor = c.hex),
        () => this.curFeature!.measureColor
      );
      this.addColorPicker(
        'fillPicker',
        (c) => (this.curFeature!.fillColor = c.hex),
        () => this.curFeature!.fillColor
      );
      this.addColorPicker(
        'strokePicker',
        (c) => (this.curFeature!.strokeColor = c.hex),
        () => this.curFeature!.strokeColor
      );
      this.getById('optionsTitle').oninput = (e) => {
        this.curFeature!.name = (e.target as HTMLInputElement).value;
        this.getById('name-f-' + this.curFeature!.id).innerHTML = this.curFeature!.name;
        this.render();
      };
      this.getById('fixedLengthValue').oninput = (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.olDrawing.setFixedLength(val);
        this.cesiumDrawing.setFixedLength(val);
      };
      this.getById('fixedLengthEnabled').onchange = (e) => {
        const elements = Array.from(this.shadowRoot?.querySelectorAll('.fixedLengthElement')!);
        const option = e.target as HTMLInputElement;
        if (!option.disabled && option.checked) {
          elements.forEach((e) => e.classList.remove('disabled'));
          this.getById<HTMLInputElement>('fixedLengthValue').dispatchEvent(new Event('input'));
        } else {
          elements.forEach((e) => e.classList.add('disabled'));
          this.olDrawing.setFixedLength(0);
          this.cesiumDrawing.setFixedLength(0);
        }
      };
    }
  }

  addColorPicker(id: string, set: (c: typeof Color) => any, get: () => string) {
    const picker = new Picker({ parent: this.getById(id), popup: 'top' });
    const update = (c: typeof Color) => {
      set(c);
      this.getById(id).style.backgroundColor = c.hex;
    };
    picker.onChange = update;
    picker.onDone = update;
    this.colorPickers.push([picker, get]);
  }

  serialize() {
    return this.drawingState.features.map((f) => f.serialize());
  }

  deserialize(serializedFeatures: SerializedFeature[]) {
    serializedFeatures.forEach((f) => this.drawingState.features.push(DrawingFeature.deserialize(f)));
  }

  setTool(tool: DrawingShape | null = null) {
    if (this.toolSelected !== null) {
      this.toolSelected.className = '';
    }
    this.toolSelected = this.getById(this.buttons.find((x) => x.tool == tool)!.id)!;
    this.toolSelected.className = 'selected';
    this.drawingState.activeTool = tool;

    this.updateOptionFixedLength(tool);
  }

  updateOptionFixedLength(tool: DrawingShape | null) {
    // Enable / disable fix length checkbox based on current tool
    if (!this.renderedOnce) {
      return;
    }
    const option = this.getById<HTMLInputElement>('fixedLengthEnabled');
    option.disabled = [
      null,
      DrawingShape.Point,
      DrawingShape.Rectangle,
      DrawingShape.FreehandPolyline,
      DrawingShape.FreehandPolygon
    ].includes(tool);
    // Trigger event to enable/disable children elements
    option.dispatchEvent(new Event('change'));
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.subscribe('interface.drawingPanelVisible', (_, newValue) => this.togglePanel(newValue));
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
    deleted.forEach((f) => this.getById('f-' + f.id).remove());
    added.forEach((f) => this.addFeatureToList(f));
    this.olDrawing.deleteFeatures(deleted);
    this.olDrawing.addFeatures(added);
    // OlCesium is currently managing features in Cesium
    //this.cesiumDrawing.addFeatures(added)
    //this.cesiumDrawing.deleteFeatures(deleted)
  }

  onProjectionChanged(oldProj: string, newProj: string) {
    if (oldProj != null && oldProj != newProj) {
      const geoJson = new GeoJSON();
      const features: DrawingFeature[] = [...this.drawingState.features];
      features.forEach((f) => {
        // TODO Handle the case of disks
        f.geojson = geoJson.writeFeatureObject(
          geoJson.readFeature(f.geojson, { dataProjection: oldProj, featureProjection: newProj })
        );
      });
      // Refresh all the listeners
      this.drawingState.features = [];
      this.drawingState.features = features;
    }
  }

  addFeatureToList(feature: DrawingFeature) {
    const container = createDiv('f-' + feature.id, 'girafe');
    container.onclick = () => {
      if (this.drawingState.features.map((f) => f.id).includes(feature.id)) {
        Array.from(this.getById('drawingList').children).forEach((e) => e.classList.remove('selected'));
        container.classList.add('selected');
        this.curFeature = feature;
        this.updateOptionPanel();
      }
    };
    container.appendChild(createDiv('', 'icon', locateIcon, () => this.olDrawing.centerViewOnFeature(feature)));
    const name = document.createElement('span');
    name.id = 'name-f-' + feature.id;
    name.innerHTML = feature.name;
    container.appendChild(name);
    container.appendChild(createDiv('', 'icon', trashIcon, () => this.deleteFeature(feature)));
    this.getById('drawingList').appendChild(container);
  }

  updateOptionPanel() {
    if (this.curFeature != null) {
      this.getById('options').classList.remove('disabled');
      this.colorPickers.forEach((val) => val[0].setColor(val[1]()));
      this.getById('visibleIconName').innerHTML = this.curFeature.displayName ? visibleIcon : notVisibleIcon;
      this.getById('visibleIconMeasure').innerHTML = this.curFeature.displayMeasure ? visibleIcon : notVisibleIcon;
      if (this.curFeature.isPointOrPolyline()) {
        this.getById('fillPickerSpan').classList.add('disabled');
        this.getById('fillPicker').classList.add('disabled');
      } else {
        this.getById('fillPickerSpan').classList.remove('disabled');
        this.getById('fillPicker').classList.remove('disabled');
      }
      this.render();
    }
  }

  deleteFeature(feature: DrawingFeature) {
    if (confirm(`Do you want to remove "${feature.name}" ?`)) {
      this.drawingState.features = this.drawingState.features.filter((f) => f.id != feature.id);
      this.curFeature = null;
      this.getById('options').classList.add('disabled');
    }
  }

  onOptionsChange() {
    if (this.curFeature != null) {
      this.curFeature.nameFontSize = parseInt(this.getById<HTMLInputElement>('optionsNameFontSize').value);
      this.curFeature.measureFontSize = parseInt(this.getById<HTMLInputElement>('optionsMeasuresFontSize').value);
      this.curFeature.strokeWidth = parseInt(this.getById<HTMLInputElement>('optionsStrokeWidth').value);
    }
  }

  toggleNameVisibility() {
    if (this.curFeature != null) {
      this.curFeature.displayName = !this.curFeature.displayName;
      this.getById('visibleIconName').innerHTML = this.curFeature.displayName ? visibleIcon : notVisibleIcon;
    }
  }

  toggleMeasureVisibility() {
    if (this.curFeature != null) {
      this.curFeature.displayMeasure = !this.curFeature.displayMeasure;
      this.getById('visibleIconMeasure').innerHTML = this.curFeature.displayMeasure ? visibleIcon : notVisibleIcon;
    }
  }

  exportFeature(feature: DrawingFeature, format: 'geojson' | 'kml' | 'gpx') {
    if (feature != null) {
      let olFeature = this.olDrawing.createOlFeature(feature);
      if (feature.type == DrawingShape.Disk) {
        const geojson = feature.geojson as any;
        const style = olFeature.getStyle();
        olFeature = new Feature(
          new Polygon([DrawingFeature.circleToPolygon(geojson.geometry.center, geojson.geometry.radius)])
        );
        olFeature.setStyle(style);
      }
      switch (format) {
        case 'geojson':
          return download(
            JSON.stringify(new GeoJSON().writeFeatureObject(olFeature, { featureProjection: this.state.projection })),
            feature.name + '.geojson',
            '.geojson'
          );
        case 'kml':
          return download(
            new KML().writeFeatures([olFeature], { featureProjection: this.state.projection }),
            feature.name + '.kml',
            '.kml'
          );
        case 'gpx':
          if (!feature.isPointOrPolyline()) {
            return this.state.infobox.elements.push({
              id: uuidv4(),
              text: 'Warning : The GPX format only supports points and polylines',
              type: 'warning'
            });
          }
          return download(
            new GPX().writeFeatures([olFeature], { featureProjection: this.state.projection }),
            feature.name + '.gpx',
            '.gpx'
          );
      }
    }
  }
}
