// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { SelectionMode, SelectionTool } from '../../models/selection';
import { Draw, Interaction } from 'ol/interaction';
import { MapBrowserEvent } from 'ol';
import MapComponent from '../map/component';
import { createBox, DrawEvent } from 'ol/interaction/Draw';
import { Circle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style';
import { Circle as CircleGeom, LineString, Point, Polygon } from 'ol/geom';
import { FeatureLike } from 'ol/Feature';
import {
  ensurePolygonIsProperlyClosed,
  getAreaOfPolygon,
  getAreaAsMetricText,
  getDistance,
  getHalfPoint,
  getLabelStyle,
  getLengthAsMetricText,
  getRadiusDataForCircle,
  getAreaOfCircle
} from '../../tools/utils/olutils';
import IGirafePanel from '../../tools/state/igirafepanel';

const defaultFill = new Fill({
  color: 'rgba(255, 255, 255, 0.5)'
});
const defaultStroke = new Stroke({
  color: 'rgba(0, 153, 255, 1)',
  width: 3
});

export default class SelectionToolComponent extends GirafeHTMLElement implements IGirafePanel {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  isPanelVisible = false;
  panelTitle = 'selection-tool-panel';
  panelTogglePath = 'interface.selectionToolPanelVisible';

  renderedOnce = false;

  buttons: { id: string; tool: SelectionTool }[] = [
    { id: 'point', tool: SelectionTool.Point },
    { id: 'rectangle', tool: SelectionTool.Rectangle },
    { id: 'polygon', tool: SelectionTool.Polygon },
    { id: 'circle', tool: SelectionTool.Disk },
    { id: 'freepolygon', tool: SelectionTool.FreehandPolygon }
  ];
  toolSelected: Element | null = null;

  selectionMode: SelectionMode = SelectionMode.Replace;

  canExecuteSelect = () => this.context.userInteractionManager.canListenerExecute('map.select', this.name);

  get drawing() {
    return this.context.configManager.Config.drawing;
  }

  get map() {
    return this.context.mapManager.getMap();
  }

  get mapComponent() {
    return this.context.componentManager.getComponents(MapComponent)[0];
  }

  private defaultStyle!: Style;
  private labelStyle!: Style;

  styleFunction = (featureLike: FeatureLike) => {
    const styles: Array<Style | undefined> = [this.defaultStyle];
    if (featureLike.getGeometry()?.getType() == 'Polygon') {
      const polygon = featureLike.getGeometry() as Polygon;
      const segments = ensurePolygonIsProperlyClosed(polygon);
      new LineString(segments).forEachSegment((a, b) => {
        styles.push(
          getLabelStyle(
            getHalfPoint([a, b]),
            getLengthAsMetricText(getDistance([a, b], this.state.projection)),
            this.labelStyle
          )
        );
      });
      styles.push(
        getLabelStyle(
          polygon.getInteriorPoint(),
          getAreaAsMetricText(getAreaOfPolygon(polygon, this.state.projection)),
          this.labelStyle
        )
      );
    } else if (featureLike.getGeometry()?.getType() == 'Circle') {
      const circle = featureLike.getGeometry() as CircleGeom;
      const radiusDataForCircle = getRadiusDataForCircle(
        circle,
        this.defaultStyle,
        new Stroke({ color: 'rgba(0, 0, 0, 0.4)', width: this.drawing.defaultStrokeWidth })
      );
      styles.push(
        radiusDataForCircle.style,
        getLabelStyle(
          getHalfPoint(radiusDataForCircle.radiusLine),
          getLengthAsMetricText(radiusDataForCircle.radius),
          this.labelStyle
        ),
        getLabelStyle(
          new Point(circle.getCenter()),
          getAreaAsMetricText(getAreaOfCircle(circle, this.state.projection)),
          this.labelStyle
        )
      );
    }
    return styles.filter((style) => !!style);
  };

  selectPoint = new Interaction({
    handleEvent: (event: MapBrowserEvent) => {
      if (event.type == 'singleclick') {
        this.state.selection.selectionGeometry = undefined;
        this.mapComponent.onClick(event as MapBrowserEvent<PointerEvent>);
        return false;
      }
      return true;
    }
  });

  selectRectangle = new Draw({
    type: 'Circle',
    geometryFunction: createBox(),
    freehand: false,
    stopClick: true,
    condition: this.canExecuteSelect,
    style: this.styleFunction
  });

  selectPolygon = new Draw({
    type: 'Polygon',
    freehand: false,
    stopClick: true,
    condition: this.canExecuteSelect,
    style: this.styleFunction
  });

  selectFreehandPolygon = new Draw({
    type: 'Polygon',
    freehand: true,
    stopClick: true,
    condition: this.canExecuteSelect
  });

  selectCircle = new Draw({
    type: 'Circle',
    freehand: false,
    condition: this.canExecuteSelect,
    style: this.styleFunction
  });

  selectInteractions: Record<SelectionTool, Interaction | undefined> = {
    [SelectionTool.Point]: this.selectPoint,
    [SelectionTool.Rectangle]: this.selectRectangle,
    [SelectionTool.Polygon]: this.selectPolygon,
    [SelectionTool.Disk]: this.selectCircle,
    [SelectionTool.FreehandPolygon]: this.selectFreehandPolygon
  };
  lastSelectInteraction: Interaction | undefined = undefined;

  constructor(name = 'selection-tool') {
    super(name);

    this.addSelectionHandlers();
  }

  private addSelectionHandlers() {
    for (const drawInteraction of Object.values(this.selectInteractions).filter(
      (selectInteraction) => selectInteraction instanceof Draw
    )) {
      drawInteraction?.on('drawend', (event: DrawEvent) => {
        console.log('drawend', event.feature.getStyleFunction());
        this.state.selection.selectionGeometry = event.feature.getGeometry();
        this.mapComponent.select(event.feature.getGeometry()!.getExtent());
      });
    }
  }

  render() {
    super.render();

    this.selectionMode = this.state.selection.selectionMode;

    if (this.isPanelVisible) {
      this.renderComponent();
    } else {
      this.hide();
    }
    super.girafeTranslate();
  }

  renderComponent() {
    this.show();
    if (!this.renderedOnce) {
      this.renderedOnce = true;
      for (const button of this.buttons) {
        this.getById(button.id).addEventListener('pointerup', () => {
          this.setTool(button.tool);
          if (button.tool) {
            this.refreshRender();
          }
        });
      }
      this.setTool(SelectionTool.Point);
    }
  }

  setTool(tool: SelectionTool | null) {
    if (this.toolSelected !== null) {
      this.toolSelected.classList.remove('selected');
    }
    if (tool != null) {
      this.toolSelected = this.getById(this.buttons.find((x) => x.tool == tool)!.id)!;
      this.toolSelected.classList.add('selected');
    }

    if (this.lastSelectInteraction) {
      this.map.removeInteraction(this.lastSelectInteraction);
      this.lastSelectInteraction = undefined;
    }
    if (tool != null) {
      const interaction = this.selectInteractions[tool];
      if (interaction) {
        this.map.addInteraction(interaction);
        this.lastSelectInteraction = interaction;
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();

    this.render();

    this.defaultStyle = new Style({
      image: new Circle({
        fill: defaultFill,
        stroke: defaultStroke,
        radius: 5
      }),
      fill: defaultFill,
      stroke: defaultStroke,
      text: new Text({
        text: '',
        font: this.drawing.defaultFont,
        textBaseline: 'bottom',
        offsetY: 1.2 * this.drawing.defaultTextSize,
        fill: new Fill({ color: '#000000' }),
        overflow: true
      })
    });

    this.labelStyle = new Style({
      text: new Text({
        font: this.drawing.defaultFont,
        padding: [2, 2, 2, 2],
        textBaseline: 'bottom',
        offsetY: -1 * this.drawing.defaultTextSize,
        fill: new Fill({ color: '#000000' })
      }),
      image: new RegularShape({
        radius: 6,
        points: 3,
        angle: Math.PI,
        displacement: [0, 8],
        fill: new Fill({ color: 'rgba(0, 0, 0, 0.4)' })
      })
    });
  }

  togglePanel(visible: boolean) {
    if (this.isPanelVisible == visible) return;

    this.isPanelVisible = visible;
    if (this.isPanelVisible) {
      this.setTool(SelectionTool.Point);
      this.registerEvents();
    } else {
      this.state.selection.selectionGeometry = undefined;
      this.state.selection.selectionMode = SelectionMode.Replace;
      this.setTool(null);
      this.unregisterEvents();
    }

    this.render();
  }

  registerEvents() {
    this.registerInteractionListener('map.select', true);
  }

  unregisterEvents() {
    this.unregisterInteractionListeners('map.select');
  }

  onSelectionModeChanged(event: Event) {
    const selectionModeAsString = (event?.target as HTMLInputElement).value;
    if (selectionModeAsString === '1') {
      this.selectionMode = SelectionMode.Add;
    } else if (selectionModeAsString === '2') {
      this.selectionMode = SelectionMode.Remove;
    } else {
      this.selectionMode = SelectionMode.Replace;
    }
    this.state.selection.selectionMode = this.selectionMode;
  }
}
