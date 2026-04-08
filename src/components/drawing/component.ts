// SPDX-License-Identifier: Apache-2.0
import { Color } from 'vanilla-picker';
import { v4 as uuidv4 } from 'uuid';
import DrawingFeature, { ArrowPosition, ArrowStyle, DrawingShape, DrawingState, LineStroke } from './drawingFeature';
import OlDrawing from './olDrawing';
import CesiumDrawing from './cesiumDrawing';

import { GeoJSON, GPX, KML } from 'ol/format';
import { Geometry, Polygon } from 'ol/geom';
import Feature from 'ol/Feature';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { download } from '../../tools/export/download';
import MapComponent from '../map/component';
import GirafeColorPicker from '../../tools/utils/girafecolorpicker';

import checkedIcon from '../../assets/icons/checked-full.svg?raw';
import noCheckedIcon from '../../assets/icons/checked-no.svg?raw';
import trashIcon from './assets/trash.svg?raw';
import locateIcon from './assets/locate.svg?raw';
import visibleIcon from './assets/visible.svg?raw';
import notVisibleIcon from './assets/notVisible.svg?raw';
import LayerDrawing from '../../models/layers/layerdrawing';
import IGirafePanel from '../../tools/state/igirafepanel';
import { FixedDimensionValueChangedEventDetails } from './fixed-dimension/component';
import { UsedInTemplateOnly } from '../../decorators';

export default class DrawingComponent extends GirafeHTMLElement implements IGirafePanel {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  isPanelVisible = false;
  panelTitle = 'drawing-panel';
  panelTogglePath = 'interface.drawingPanelVisible';

  checkedIcon: string = checkedIcon;
  noCheckedIcon: string = noCheckedIcon;
  trashIcon: string = trashIcon;
  locateIcon: string = locateIcon;
  visibleIcon: string = visibleIcon;
  notVisibleIcon: string = notVisibleIcon;

  renderedOnce = false;
  drawingState!: DrawingState;
  colorPickers: [GirafeColorPicker, () => string][] = [];

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

  arrowStyles: Record<ArrowStyle, string> = {
    none: '⸻',
    start: 'ᐸ⸺',
    end: '⸺ᐳ',
    both: 'ᐸ—ᐳ'
  };
  arrowPositions: Record<ArrowPosition, string> = {
    whole: 'ᐸ⸺⸺ᐳ',
    each: 'ᐸ—ᐳᐸ—ᐳ',
    mid: '⸺ᐸ⸺'
  };
  lineStyles: Record<string, string> = {
    full: '————',
    dash: '━ ━ ━',
    dot: '• • • • • •'
  };

  activeDrawingLayer?: LayerDrawing;
  defaultLayerName = 'My Drawing';

  olDrawing!: OlDrawing;
  cesiumDrawing!: CesiumDrawing;
  fixedLengthEnabled: boolean = false;
  // Batch Create mode is currently not used. Batch mode allows the user to create multiple shapes without re-selecting
  //  the drawing tool. It possibly will be part of advanced drawing/editing tools.
  batchCreateMode: boolean = false;

  public constructor(name = 'drawing') {
    super(name);
  }

  render() {
    super.render();
    if (this.isPanelVisible) {
      this.renderComponent();
      this.state.layers.isSnappingActive = true;
    } else {
      this.hide();
      this.state.layers.isSnappingActive = false;
    }
    super.girafeTranslate();
  }

  private renderComponent() {
    this.show();
    if (!this.renderedOnce) {
      this.renderedOnce = true;
      this.buttons.forEach((b) => {
        this.getById(b.id).addEventListener('pointerup', () => {
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
      this.setTool();
    }
    this.warnWhenInWebMercator();
  }

  refreshRender() {
    // Set the color picker color to the properties of the first selected feature. Necessary, so subsequently
    // selected features do not change color immediately upon selecting them, but only after manually setting
    // the color via color picker.
    if (this.selectedFeatures.length === 1) {
      this.colorPickers.forEach((val) => val[0].setColor(val[1](), false));
    }
    super.refreshRender();
  }

  registerEvents() {
    this.olDrawing.registerInteractions();
    if (this.state.globe.loaded) this.cesiumDrawing.registerInteractions();
  }

  unregisterEvents() {
    this.olDrawing.unregisterInteractions();
    this.cesiumDrawing.unregisterInteractions();
  }

  addColorPicker(id: string, set: (c: Color) => unknown, get: () => string) {
    const parent = this.getById(id);
    const picker = new GirafeColorPicker({ parent: parent, popup: 'top' }, !this.state.interface.isMobile);
    const update = (c: Color) => {
      set(c);
      parent.style.backgroundColor = c.hex;
    };
    picker.onChange = update;
    picker.onDone = update;
    this.colorPickers.push([picker, get]);
  }

  setTool(tool: DrawingShape | null = null) {
    if (tool) {
      this.activateLayerInTreeAndMap();
    }
    if (this.toolSelected !== null) {
      this.toolSelected.classList.remove('selected');
    }
    this.toolSelected = this.getById(this.buttons.find((x) => x.tool == tool)!.id)!;
    this.toolSelected.classList.add('selected');
    this.drawingState.activeTool = tool;

    this.showToolParameters(tool);
  }

  showToolParameters(tool: DrawingShape | null = null) {
    const toolName = tool ? DrawingShape[tool] : 'Pointer';
    const toolParametersList = this.shadowRoot!.querySelectorAll<HTMLDivElement>('.toolParameters');
    let hasParameters = false;
    toolParametersList.forEach((toolParameters) => {
      const isParametersForTool = toolParameters.dataset.tool?.includes(toolName) ?? false;
      toolParameters.style.display = isParametersForTool ? 'flex' : 'none';
      hasParameters ||= isParametersForTool;
    });
    this.shadow.querySelector<HTMLSpanElement>('#toolParametersContainer span.title')!.style.display = hasParameters
      ? 'inline-block'
      : 'none';
  }

  @UsedInTemplateOnly()
  protected fixedDimensionValueChangedHandler(e: CustomEvent) {
    const details = e.detail as FixedDimensionValueChangedEventDetails;
    switch (details.id) {
      case 'fixedLineLength':
        this.olDrawing.setFixedLineLength(details.value);
        break;
      case 'fixedSquareSide':
        this.olDrawing.setFixedSquareSide(details.value);
        break;
      case 'fixedRectangleWidth':
        this.olDrawing.setFixedRectangleWidth(details.value);
        break;
      case 'fixedRectangleHeight':
        this.olDrawing.setFixedRectangleHeight(details.value);
        break;

      default:
        console.debug('Value changed for unknown Dimension with id', details.id);
    }
  }

  protected override connectedCallback() {
    super.connectedCallback();
    if (!this.state.extendedState.drawing) {
      throw new Error('ExtendedState has to be defined in main typescript file.');
    }
    this.drawingState = this.state.extendedState.drawing as DrawingState;
    const map = this.context.componentManager.getComponents(MapComponent)[0];
    this.olDrawing = new OlDrawing(map, this.name, this.context, (featureId: string) => {
      const drawingFeature = this.drawingState.features.find((drawingFeature) => drawingFeature.id === featureId);
      if (drawingFeature) {
        this.deleteFeature(drawingFeature);
      }
    });
    this.cesiumDrawing = new CesiumDrawing(map, this.name, this.context);

    this.render();

    this.subscribe('extendedState.drawing.features', (olds, news) => this.onFeaturesChanged(olds, news));
    this.subscribe('projection', (olds, news) => this.onProjectionChanged(olds, news));
    this.subscribe('globe.loaded', () => {
      if (this.state.globe.loaded && this.isPanelVisible) {
        this.cesiumDrawing.registerInteractions();
      } else {
        this.cesiumDrawing.unregisterInteractions();
      }
    });

    this.subscribe('projection', (_, newProjection) => this.warnWhenInWebMercator(newProjection));
  }

  togglePanel(visible: boolean) {
    if (this.isPanelVisible == visible) return;

    this.isPanelVisible = visible;
    if (this.isPanelVisible) {
      this.registerEvents();
      if (this.activeDrawingLayer) {
        this.activateLayerInTreeAndMap();
      }
    } else {
      this.setTool(null);
      // Deselect features so the vertex symbology disappears
      this.deselectAllFeatures();
      // Unregister events, remove interactions
      this.unregisterEvents();
    }

    this.render();
  }

  get selectedFeatures(): DrawingFeature[] {
    return this.drawingState.features.filter((f) => f.selected);
  }

  deselectAllFeatures() {
    this.drawingState.features.forEach((feature) => (feature.selected = false));
  }

  onFeaturesChanged(oldFeatures: DrawingFeature[], newFeatures: DrawingFeature[]) {
    oldFeatures = oldFeatures ?? [];
    const newIds = newFeatures.map((f) => f.id);
    const oldIds = oldFeatures.map((f) => f.id);
    const deleted = oldFeatures.filter((f) => !newIds.includes(f.id));
    const added = newFeatures.filter((f) => !oldIds.includes(f.id));

    // Update the current feature selection
    if (!this.isPanelVisible || this.batchCreateMode) {
      // If the component isn't visible (e.g. if features are added via shared state), deselect all features
      this.deselectAllFeatures();
    } else if (added.length > 0) {
      // Only select the newly created feature
      this.drawingState.features.forEach((feature) => (feature.selected = added.map((f) => f.id).includes(feature.id)));
    }

    // Toggle the drawing layer in the tree and map
    if (newIds.length > 0) {
      this.activateLayerInTreeAndMap();
    } else {
      this.deactivateLayerInTreeAnMap();
    }

    // Update drawing source
    if (deleted.length > 0) this.olDrawing.deleteFeatures(deleted);
    if (added.length > 0) this.olDrawing.addFeatures(added);
    // OlCesium is currently managing features in Cesium
    //this.cesiumDrawing.addFeatures(added)
    //this.cesiumDrawing.deleteFeatures(deleted)

    if (this.isPanelVisible) {
      // Deactivate the drawing tool after finishing the shape
      if (!this.batchCreateMode) {
        this.setTool(null);
      }
      this.refreshRender();
    }
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

  @UsedInTemplateOnly('Currently not used, will possibly be part of advanced editing/drawing tools')
  protected onToggleBatchMode() {
    this.batchCreateMode = !this.batchCreateMode;
    if (this.batchCreateMode) {
      this.deselectAllFeatures();
    }
    this.refreshRender();
  }

  onToggleFeatureSelection(feature: DrawingFeature) {
    this.setTool(null);
    feature.selected = !feature.selected;
    this.refreshRender();
  }

  activateLayerInTreeAndMap(layerName: string = this.defaultLayerName) {
    this.activeDrawingLayer ??= new LayerDrawing(layerName, this.olDrawing.drawingLayer);
    // Activate the layer by adding it to the tree and making it visible in the map
    this.context.userLayerManager.addUserLayerToTree(this.activeDrawingLayer);
  }

  deactivateLayerInTreeAnMap() {
    if (this.activeDrawingLayer) {
      this.context.userLayerManager.removeUserLayerFromTree(this.activeDrawingLayer);
      this.activeDrawingLayer = undefined;
    }
  }

  @UsedInTemplateOnly()
  protected getOptionsTitle(): string {
    if (this.selectedFeatures.length < 2) {
      return this.selectedFeatures[0]?.name || '';
    } else {
      return `${this.selectedFeatures.length} Shapes selected`;
    }
  }

  @UsedInTemplateOnly()
  protected isDisplayNameEnabled(): boolean {
    return this.selectedFeatures.some((f) => f.displayName);
  }

  @UsedInTemplateOnly()
  protected isDisplayMeasureEnabled(): boolean {
    return this.selectedFeatures.some((f) => f.displayMeasure);
  }

  @UsedInTemplateOnly()
  protected isLineStyleEnabled(): boolean {
    return this.selectedFeatures.some(
      (f) => f.type == DrawingShape.Polyline || f.type == DrawingShape.FreehandPolyline
    );
  }

  @UsedInTemplateOnly()
  protected isFillColorEnabled(): boolean {
    return !this.selectedFeatures.every((f) => f.isPointOrPolyline());
  }

  async deleteFeature(feature: DrawingFeature) {
    const confirm = await window.gConfirm(
      'Do you want to remove "${feature.name}" ?',
      'Delete Feature',
      (translatedMessage: string) => {
        return translatedMessage.replace('${feature.name}', feature.name);
      }
    );
    if (confirm) {
      const idx = this.drawingState.features.findIndex((f) => f.id === feature.id);
      if (idx > -1) {
        this.drawingState.features.splice(idx, 1);
        this.refreshRender();
      }
    }
  }

  async deleteAllFeatures() {
    const confirm = await window.gConfirm('Do you want to remove all features?', 'Delete Features');
    if (confirm) {
      this.drawingState.features = [];
      this.refreshRender();
    }
  }

  onOptionsChange() {
    const nameFontSize = parseInt(this.getById<HTMLInputElement>('optionsNameFontSize').value);
    const measureFontSize = parseInt(this.getById<HTMLInputElement>('optionsMeasuresFontSize').value);
    const strokeWidth = parseInt(this.getById<HTMLInputElement>('optionsStrokeWidth').value);
    const lineStroke = this.getById<HTMLSelectElement>('line-style').value;
    this.selectedFeatures.forEach((f) => (f.nameFontSize = nameFontSize));
    this.selectedFeatures.forEach((f) => (f.measureFontSize = measureFontSize));
    this.selectedFeatures.forEach((f) => (f.strokeWidth = strokeWidth));
    this.selectedFeatures.forEach((f) => (f.lineStroke = lineStroke as LineStroke));
  }

  onArrowsChange() {
    const arrowStyle = this.getById<HTMLSelectElement>('arrow-style').value;
    const arrowPosition = this.getById<HTMLSelectElement>('arrow-position').value;
    this.selectedFeatures.forEach((f) => (f.arrowStyle = arrowStyle as ArrowStyle));
    this.selectedFeatures.forEach((f) => (f.arrowPosition = arrowPosition as ArrowPosition));
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

  private warnWhenInWebMercator(projection: string = this.state.projection) {
    if (this.isPanelVisible && projection === 'EPSG:3857') {
      const errorMessage = 'Web Mercator projection distorts distances and areas';
      this.context.stateManager.state.infobox.elements.push({
        id: uuidv4(),
        text: this.context.i18nManager.getTranslation(errorMessage),
        type: 'warning'
      });
    }
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
          this.context.errorManager.pushMessage(
            'export-gpx-error',
            'The GPX format only supports points and polylines',
            'warning'
          );
        } else {
          return download(
            new GPX().writeFeatures(olFeatures, { featureProjection: this.state.projection }),
            fileName + '.gpx',
            'application/gpx+xml'
          );
        }
    }
  }
}
