import Picker, { Color } from 'vanilla-picker';
import { v4 as uuidv4 } from 'uuid';
import DrawingFeature, { DrawingState, SerializedFeature, DrawingShape } from './drawingFeature';
import OlDrawing from './olDrawing';
import CesiumDrawing from './cesiumDrawing';

import { KML, GeoJSON, GPX } from 'ol/format';
import { Polygon, Geometry } from 'ol/geom';
import Feature from 'ol/Feature';
import { Coordinate } from 'ol/coordinate';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { download } from '../../tools/export/download';
import MapComponent from '../map/component';
import { alternateMouseClick, ContextMenu, MenuEntry } from '../map/tools/contextmenu';

import checkedIcon from '../../assets/icons/checked-full.svg?raw';
import noCheckedIcon from '../../assets/icons/checked-no.svg?raw';
import trashIcon from '../../assets/icons/trash.svg?raw';
import locateIcon from './assets/locate.svg?raw';
import visibleIcon from './assets/visible.svg?raw';
import notVisibleIcon from './assets/notVisible.svg?raw';
import { formatCoordinates } from '../../tools/geometrytools';

export default class DrawingComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../styles/common.css'];

  checkedIcon: string = checkedIcon;
  noCheckedIcon: string = noCheckedIcon;
  trashIcon: string = trashIcon;
  locateIcon: string = locateIcon;
  visibleIcon: string = visibleIcon;
  notVisibleIcon: string = notVisibleIcon;

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

  olDrawing: OlDrawing;
  cesiumDrawing: CesiumDrawing;
  mapContextMenu: ContextMenu | undefined = undefined;
  fixedLengthEnabled: boolean = false;
  // Batch Create mode is currently not used. Batch mode allows the user to create multiple shapes without re-selecting
  //  the drawing tool. It possibly will be part of advanced drawing/editing tools.
  batchCreateMode: boolean = false;

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
    this.visible ? this.renderComponent() : this.hide();
    this.state.selection.enabled = !this.visible;
    this.activateTooltips(false, [800, 0], 'top-end');
    super.girafeTranslate();
  }

  renderComponent() {
    this.show();
    if (!this.renderedOnce) {
      this.renderedOnce = true;
      this.buttons.forEach((b) => {
        this.getById(b.id).addEventListener('click', () => {
          this.setTool(b.tool);
          if (b.tool) {
            this.deselectAllFeatures();
            this.refreshRender();
          }
        });
      });
      this.addColorPicker(
        'nameColorPicker',
        (c) => this.selectedFeatures.forEach((f) => (f.nameColor = c.hex)),
        () => this.selectedFeatures[0].nameColor
      );
      this.addColorPicker(
        'measureColorPicker',
        (c) => this.selectedFeatures.forEach((f) => (f.measureColor = c.hex)),
        () => this.selectedFeatures[0].measureColor
      );
      this.addColorPicker(
        'fillPicker',
        (c) => this.selectedFeatures.forEach((f) => (f.fillColor = c.hex)),
        () => this.selectedFeatures[0].fillColor
      );
      this.addColorPicker(
        'strokePicker',
        (c) => this.selectedFeatures.forEach((f) => (f.strokeColor = c.hex)),
        () => this.selectedFeatures[0].strokeColor
      );
      this.getById('optionsTitle').oninput = (e) => {
        this.selectedFeatures[0].name = (e.target as HTMLInputElement).value;
        this.refreshRender();
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

      this.createMapContextMenu();
      this.setTool();
    }
  }

  refreshRender() {
    // Set the color picker color to the properties of the first selected feature. Necessary, so subsequently
    // selected features do not change color immediately upon selecting them, but only after manually setting
    // the color via color picker.
    if (this.selectedFeatures.length === 1) {
      this.colorPickers.forEach((val) => val[0].setColor(val[1]()));
    }
    super.refreshRender();
  }

  addColorPicker(id: string, set: (c: typeof Color) => any, get: () => string) {
    const parent = this.getById(id);
    const picker = new Picker({ parent: parent, popup: 'top' });
    picker.originalOpenHandler = picker.openHandler;
    picker.openHandler = (e: PointerEvent) => this.customColorPickerOpenHandler(picker, parent, e);
    const update = (c: typeof Color) => {
      set(c);
      parent.style.backgroundColor = c.hex;
    };
    picker.onChange = update;
    picker.onDone = update;
    this.colorPickers.push([picker, get]);
  }

  customColorPickerOpenHandler(picker: any, parent: HTMLElement, e: PointerEvent) {
    /**
     * There is a CSS limitation when using overflow :
     * we cannot have an overflow-y scrollable and at the same time an overflow-x visible.
     * It just doesn't work as explain here for example:
     * https://www.reddit.com/r/css/comments/1b9jyvx/overflowy_scroll_overflowx_visible_at_same_time/
     * But we need this in our case, because the panel must be scrollable,
     * and the picker must stay visible when opened.
     * To solve this, we have to display the color-picker as 'fixed' to escape
     * the encapsulation of the parent component.
     * This can at the moment only be done by overriding the openHandler() method
     * of the vanilla-picker component:
     * https://github.com/Sphinxxxx/vanilla-picker/issues/24.
     */
    picker.originalOpenHandler(e);
    if (e.target === parent) {
      picker.domElement.style.position = 'fixed';
      const left = parent.getBoundingClientRect().left + parent.getBoundingClientRect().width;
      const bottom =
        window.innerHeight - (parent.getBoundingClientRect().bottom - parent.getBoundingClientRect().height);
      picker.domElement.style.left = `${left}px`;
      picker.domElement.style.bottom = `${bottom}px`;
    }
  }

  serialize() {
    return this.drawingState.features.map((f) => f.serialize());
  }

  deserialize(serializedFeatures: SerializedFeature[]) {
    serializedFeatures.forEach((f) => this.drawingState.features.push(DrawingFeature.deserialize(f)));
  }

  setTool(tool: DrawingShape | null = null) {
    if (this.toolSelected !== null) {
      this.toolSelected.classList.remove('selected');
    }
    this.toolSelected = this.getById(this.buttons.find((x) => x.tool == tool)!.id)!;
    this.toolSelected.classList.add('selected');
    this.drawingState.activeTool = tool;
  }

  fixedLengthOptionAllowed(): boolean {
    // Enable / disable fix length checkbox based on current tool
    return ![
      null,
      DrawingShape.Point,
      DrawingShape.Rectangle,
      DrawingShape.FreehandPolyline,
      DrawingShape.FreehandPolygon
    ].includes(this.drawingState.activeTool);
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      this.subscribe('interface.drawingPanelVisible', (_, newValue) => this.togglePanel(newValue));
    });
  }

  togglePanel(visible: boolean) {
    this.visible = visible;
    if (this.renderedOnce) {
      if (this.visible) {
        this.olDrawing.enableAllInteractions();
        this.mapContextMenu?.enable();
      } else {
        this.olDrawing.disableAllInteractions();
        // Deselect features so the vertex symbology disappears, also disable context menu
        this.deselectAllFeatures();
        this.mapContextMenu?.disable();
      }
    }
    this.render();
  }

  get selectedFeatures(): DrawingFeature[] {
    return this.drawingState.features.filter((f) => f.selected);
  }

  deselectAllFeatures() {
    this.drawingState.features.forEach((f) => (f.selected = false));
    this.olDrawing.updateModifiableFeatures([]);
  }

  onFeaturesChanged(oldFeatures: DrawingFeature[], newFeatures: DrawingFeature[]) {
    oldFeatures = oldFeatures ?? [];
    const newIds = newFeatures.map((f) => f.id);
    const oldIds = oldFeatures.map((f) => f.id);
    const deleted = oldFeatures.filter((f) => !newIds.includes(f.id));
    const added = newFeatures.filter((f) => !oldIds.includes(f.id));

    if (added.length > 0) {
      // Update the current selection: no selection if in batch mode, otherwise only include the newly created feature(s)
      this.drawingState.features.forEach(
        (feature: DrawingFeature) =>
          (feature.selected = this.batchCreateMode ? false : added.map((f) => f.id).includes(feature.id))
      );
    }
    // Update drawing source
    this.olDrawing.deleteFeatures(deleted);
    this.olDrawing.addFeatures(added);
    this.olDrawing.updateModifiableFeatures(this.selectedFeatures);
    // OlCesium is currently managing features in Cesium
    //this.cesiumDrawing.addFeatures(added)
    //this.cesiumDrawing.deleteFeatures(deleted)

    // Deactivate the drawing tool after finishing the shape
    if (!this.batchCreateMode) {
      this.setTool(null);
    }
    this.refreshRender();
  }

  onProjectionChanged(oldProj: string, newProj: string) {
    if (oldProj != null && oldProj != newProj) {
      const geoJson = new GeoJSON();
      const features: DrawingFeature[] = [...this.drawingState.features];
      features.forEach((f) => {
        // TODO Handle the case of disks
        f.geojson = geoJson.writeFeatureObject(
          geoJson.readFeature(f.geojson, { dataProjection: oldProj, featureProjection: newProj }) as Feature<Geometry>
        );
      });
      // Refresh all the listeners
      this.drawingState.features = [];
      this.drawingState.features = features;
    }
  }

  onToggleBatchMode() {
    // Currently not used, will possibly be part of advanced editing/drawing tools
    this.batchCreateMode = !this.batchCreateMode;
    if (this.batchCreateMode) {
      this.deselectAllFeatures();
    }
    this.refreshRender();
  }

  onToggleFixedLength() {
    this.fixedLengthEnabled = !this.fixedLengthEnabled;
    const val = this.fixedLengthEnabled ? parseFloat(this.getById<HTMLInputElement>('fixedLengthValue').value) : 0;
    this.olDrawing.setFixedLength(val);
    this.cesiumDrawing.setFixedLength(val);
    this.refreshRender();
  }

  onToggleFeatureSelection(feature: DrawingFeature) {
    feature.selected = !feature.selected;
    this.olDrawing.updateModifiableFeatures(this.selectedFeatures);
    this.refreshRender();
  }

  getOptionsTitle(): string {
    if (this.selectedFeatures.length < 2) {
      return this.selectedFeatures[0]?.name || '';
    } else {
      return `${this.selectedFeatures.length} Shapes selected`;
    }
  }

  isDisplayNameEnabled(): boolean {
    return this.selectedFeatures.some((f) => f.displayName);
  }

  isDisplayMeasureEnabled(): boolean {
    return this.selectedFeatures.some((f) => f.displayMeasure);
  }

  isFillColorEnabled(): boolean {
    return !this.selectedFeatures.every((f) => f.isPointOrPolyline());
  }

  deleteFeature(feature: DrawingFeature) {
    if (confirm(`Do you want to remove "${feature.name}" ?`)) {
      this.drawingState.features = this.drawingState.features.filter((f) => f.id != feature.id);
      this.refreshRender();
    }
  }

  onOptionsChange() {
    const nameFontSize = parseInt(this.getById<HTMLInputElement>('optionsNameFontSize').value);
    const measureFontSize = parseInt(this.getById<HTMLInputElement>('optionsMeasuresFontSize').value);
    const strokeWidth = parseInt(this.getById<HTMLInputElement>('optionsStrokeWidth').value);
    this.selectedFeatures.forEach((f) => (f.nameFontSize = nameFontSize));
    this.selectedFeatures.forEach((f) => (f.measureFontSize = measureFontSize));
    this.selectedFeatures.forEach((f) => (f.strokeWidth = strokeWidth));
  }

  toggleNameVisibility() {
    const currentVisibility = this.selectedFeatures.some((f) => f.displayName);
    this.selectedFeatures.forEach((f) => (f.displayName = !currentVisibility));
    this.refreshRender();
  }

  toggleMeasureVisibility() {
    const currentVisibility = this.selectedFeatures.some((f) => f.displayMeasure);
    this.selectedFeatures.forEach((f) => (f.displayMeasure = !currentVisibility));
    this.refreshRender();
  }

  createMapContextMenu() {
    const menuEntries: MenuEntry[] = [
      {
        entry: 'Remove vertex',
        callback: (_evt: MouseEvent, mapCoordinate: Coordinate) => {
          const successful = this.olDrawing.removeLastInteractedVertex();
          if (!successful) {
            const errorMessage = `It's not possible to remove vertex at ${formatCoordinates(mapCoordinate, this.configManager.Config.general.locale)}`;
            this.stateManager.state.infobox.elements.push({
              id: uuidv4(),
              text: errorMessage,
              type: 'warning'
            });
          }
        }
      }
    ];
    const conditionToOpen = (_evt: MouseEvent, mapCoordinate: Coordinate) => {
      if (!this.visible || this.selectedFeatures.length === 0) {
        return false;
      }
      // Only proceed if there is an editable vertex under the mouse pointer
      return this.olDrawing.hasEditableVertexAtCoordinate(mapCoordinate);
    };

    this.mapContextMenu = new ContextMenu(
      this.componentManager.getComponents(MapComponent)[0],
      menuEntries,
      alternateMouseClick,
      conditionToOpen
    );
  }

  exportSelectedFeatures(format: 'geojson' | 'kml' | 'gpx') {
    const olFeatures: Feature[] = [];
    const fileName = this.selectedFeatures.length === 1 ? this.selectedFeatures[0].name : 'drawing_export';

    this.selectedFeatures.forEach((feature: DrawingFeature) => {
      let olFeature = this.olDrawing.createOlFeature(feature);
      if (feature.type == DrawingShape.Disk) {
        const geojson = feature.geojson as any;
        const style = olFeature.getStyle();
        olFeature = new Feature(
          new Polygon([DrawingFeature.circleToPolygon(geojson.geometry.center, geojson.geometry.radius)])
        );
        olFeature.setStyle(style);
      }
      olFeatures.push(olFeature);
    });

    switch (format) {
      case 'geojson':
        return download(
          JSON.stringify(new GeoJSON().writeFeaturesObject(olFeatures, { featureProjection: this.state.projection })),
          fileName + '.geojson',
          'application/geo+json'
        );
      case 'kml':
        return download(
          new KML().writeFeatures(olFeatures, { featureProjection: this.state.projection }),
          fileName + '.kml',
          'application/vnd.google-earth.kml+xml'
        );
      case 'gpx':
        if (this.selectedFeatures.some((f) => !f.isPointOrPolyline())) {
          return this.state.infobox.elements.push({
            id: uuidv4(),
            text: 'Warning : The GPX format only supports points and polylines',
            type: 'warning'
          });
        }
        return download(
          new GPX().writeFeatures(olFeatures, { featureProjection: this.state.projection }),
          fileName + '.gpx',
          'application/gpx+xml'
        );
    }
  }
}
