import DrawingFeature, { DrawingShape, DrawingState, LineStroke } from './drawingFeature';
import MapComponent from '../map/component';
import StateManager from '../../tools/state/statemanager';
import State from '../../tools/state/state';
import { Collection, Feature, MapBrowserEvent } from 'ol';
import {
  Geometry,
  LineString,
  Point,
  Polygon,
  Circle as CircleGeom,
  SimpleGeometry,
  MultiPoint,
  MultiLineString,
  LinearRing,
  MultiPolygon
} from 'ol/geom';
import { createBox, createRegularPolygon, SketchCoordType } from 'ol/interaction/Draw';
import { Type } from 'ol/geom/Geometry';
import { Style, Stroke, Text, Fill, RegularShape, Circle } from 'ol/style';
import { Modify, Snap, Draw } from 'ol/interaction';
import VectorSource, { VectorSourceEvent } from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Projection, getPointResolution } from 'ol/proj';
import { Coordinate } from 'ol/coordinate';
import { never, noModifierKeys, primaryAction } from 'ol/events/condition';
import { Pixel } from 'ol/pixel';
import ConfigManager from '../../tools/configuration/configmanager';
import MapManager from '../../tools/state/mapManager';
import UserInteractionManager from '../../tools/state/userInteractionManager';
import { getDistance, getArea } from '../../tools/utils/olutils';
import { ContextMenu, MenuEntry } from '../map/tools/contextmenu';
import { formatCoordinates } from '../../tools/geometrytools';
import { v4 as uuidv4 } from 'uuid';
import {
  GgUserInteractionEvent,
  isAlternateMouseClick,
  isPrimaryPointerAction
} from '../../tools/state/userinteractionevent';

function getLineStroke(strokeType: LineStroke, lineWidth: number) {
  switch (strokeType) {
    case 'full':
    case 'double':
      return undefined;
    case 'dash':
      return [3 * lineWidth, 5 * lineWidth];
    case 'dot':
      // minimal length creates dots with rounded lineCap
      return [0.01, 5 * lineWidth];
  }
}

function getHalfPoint(coordinates: Coordinate[]) {
  return new Point(new LineString(coordinates).getCoordinateAt(0.5));
}

function fixLastLength(length: number, coordinates: SketchCoordType, scale: number = 1) {
  const coord = coordinates as Coordinate[];
  if (coord.length > 1 && length > 0) {
    const lastLine = [coord[coord.length - 2], coord[coord.length - 1]];
    coord[coord.length - 1] = new LineString(lastLine).getCoordinateAt(length / (getDistance(lastLine) * scale));
  }
}

function extractVerticesFromGeometry(geometry: Geometry): MultiPoint {
  let vertices: Coordinate[] = [];

  // Extract coordinates depending on coordinate array depth
  if (geometry instanceof Point) {
    vertices = [geometry.getCoordinates()];
  } else if (geometry instanceof MultiPoint || geometry instanceof LineString || geometry instanceof LinearRing) {
    vertices = geometry.getCoordinates();
  } else if (geometry instanceof Polygon || geometry instanceof MultiLineString) {
    vertices = geometry.getCoordinates().flat();
  } else if (geometry instanceof MultiPolygon) {
    vertices = geometry
      .getCoordinates()
      .flat()
      .map((coordinateList) => coordinateList.flat());
  }
  return new MultiPoint(vertices);
}

export default class OlDrawing {
  map: MapComponent;
  toolName: string;
  state: State;
  configManager: ConfigManager;
  userInteractionManager: UserInteractionManager;

  drawingState: DrawingState;
  drawingSource!: VectorSource;
  modifiableFeatures: Collection<Feature> = new Collection([]);
  draw: Draw | null = null;
  modify: Modify | null = null;
  snap: Snap | null = null;
  editContextMenu: ContextMenu | null = null;
  currentShape: DrawingShape | null = null;
  fixedLength: number = 0;

  constructor(map: MapComponent, toolName: string) {
    this.map = map;
    this.toolName = toolName;
    this.state = StateManager.getInstance().state;
    this.configManager = ConfigManager.getInstance();
    this.userInteractionManager = UserInteractionManager.getInstance();
    this.drawingState = this.state.extendedState.drawing as DrawingState;

    this.drawingSource = new VectorSource({ features: new Collection() });
    this.drawingSource.on('addfeature', (e) => this.onFeatureAdded(e));
    this.map.olMap.addLayer(
      new VectorLayer({
        source: this.drawingSource,
        zIndex: 1001,
        properties: {
          addToPrintedLayers: true,
          altitudeMode: 'clampToGround'
        }
      })
    );
    this.map.subscribe('extendedState.drawing.activeTool', (_oldTool, newTool) =>
      newTool === null ? this.removeDrawInteraction() : this.addDrawInteraction(newTool)
    );

    this.map.subscribe(/extendedState.drawing.features.*\.selected/, (_old, _new) => this.updateModifiableFeatures());

    // OlCesium duplicates drawn shapes when 3D view is open if its eventListener is not removed
    this.map.subscribe('globe.loaded', () => {
      if (this.state.globe.loaded) {
        this.drawingSource
          .getListeners('addfeature')
          ?.forEach((l) => this.drawingSource.removeEventListener('addfeature', l));
        this.drawingSource.on('addfeature', (e) => this.onFeatureAdded(e));
      }
    });
  }

  private addModifyInteraction() {
    this.removeModifyInteraction();
    this.modify = new Modify({
      features: this.modifiableFeatures,
      // Feature editing is triggered by: 1) primary action = click or touch, 2) alternate mouse click = remove vertex
      // If another tool is exclusively modifying, this interaction will be prevented from reacting via canExecute()
      condition: (e) =>
        (isPrimaryPointerAction(e as MapBrowserEvent<PointerEvent>) ||
          isAlternateMouseClick(e as MapBrowserEvent<PointerEvent>)) &&
        this.canExecute('map.modify'),
      deleteCondition: never,
      insertVertexCondition: primaryAction,
      style: new DrawingFeature(1, {}, '').getVertexStyle(true),
      snapToPointer: true,
      pixelTolerance: this.map.pixelTolerance
    });
    this.map.olMap.addInteraction(this.modify);

    // Update the modified geometries in the state
    this.modify.on('modifyend', (e) => {
      e.features.forEach((olFeature) => {
        const idx = this.drawingState.features.findIndex((f) => f.id === olFeature.getId());
        const drawingFeature = this.drawingState.features[idx];
        if (idx > -1) {
          this.drawingState.features[idx].geojson = DrawingFeature.geojsonFromOlFeature(olFeature, drawingFeature.type);
        }
      });
    });
  }

  private addSnapInteraction() {
    this.removeSnapInteraction();
    // Activate snapping on all existing drawing shapes
    this.snap = new Snap({ source: this.drawingSource, pixelTolerance: this.map.pixelTolerance });
    this.map.olMap.addInteraction(this.snap);
    this.state.snapActive = true;
  }

  /**
   * Adds a context menu to the map with a single entry 'remove vertex'. The menu is configured to open
   * when the user does an alternate click ( = context event) on or near a vertex of a modifiable feature.
   */
  private addEditContextMenu() {
    this.removeEditContextMenu();
    const menuEntries: MenuEntry[] = [
      {
        entry: 'Remove vertex',
        callback: (_evt: MouseEvent, mapCoordinate: Coordinate) => {
          const successful = this.removeLastInteractedVertex();
          if (!successful) {
            const errorMessage = `It's not possible to remove vertex at ${formatCoordinates(mapCoordinate, this.configManager.Config.general.locale)}`;
            this.state.infobox.elements.push({
              id: uuidv4(),
              text: errorMessage,
              type: 'warning'
            });
          }
        }
      }
    ];
    const conditionToOpen = (_evt: MouseEvent, mapCoordinate: Coordinate) => {
      if (!this.modify?.getActive() || this.modifiableFeatures.getArray().length === 0) {
        return false;
      }
      // Only proceed if there is an editable vertex under the mouse pointer
      return this.hasEditableVertexAtCoordinate(mapCoordinate);
    };
    this.editContextMenu = new ContextMenu(menuEntries, true, conditionToOpen);
  }

  addEditInteractions() {
    if (!this.modify) this.addModifyInteraction();
    if (!this.editContextMenu) this.addEditContextMenu();
    // Always recreate snap interaction to get snapping behavior on latest features
    this.addSnapInteraction();
  }

  removeEditInteractions() {
    this.removeModifyInteraction();
    this.removeEditContextMenu();
    if (!this.draw) this.removeSnapInteraction();
  }

  /**
   Check if there is a vertex of a selected (=editable) feature within the pixel tolerance of the clicked coordinates.
   */
  hasEditableVertexAtCoordinate(coordinate: Coordinate): boolean {
    const filter = (olFeature: Feature) =>
      this.modifiableFeatures.getArray().some((editFeature: Feature<Geometry>) => olFeature == editFeature);
    // Use filter to only query currently selected features
    const closestElements = this.getClosestVertexAndFeature(coordinate, filter);
    if (closestElements) {
      const closestVertex: Coordinate = closestElements[0];
      const vertexAsPixel: Pixel = this.map.olMap.getPixelFromCoordinate(closestVertex);
      const clickAsPixel: Pixel = this.map.olMap.getPixelFromCoordinate(coordinate);
      const dx = vertexAsPixel[0] - clickAsPixel[0];
      const dy = vertexAsPixel[1] - clickAsPixel[1];
      const distanceToVertex: number = Math.sqrt(dx * dx + dy * dy);
      if (distanceToVertex < this.map.pixelTolerance) {
        return true;
      }
    }
    return false;
  }

  /**
   Returns the closest vertex and feature to a coordinate from the drawing source.
   The feature source can be pre-filtered via an optional filter function.
   */
  private getClosestVertexAndFeature(
    coordinate: Coordinate,
    filter: (f: Feature) => boolean = () => true
  ): [Coordinate, Feature<Geometry>] | undefined {
    const olFeature = this.drawingSource.getClosestFeatureToCoordinate(coordinate, filter);
    const geometry = olFeature?.getGeometry();
    if (geometry && olFeature) {
      const vertices: MultiPoint = extractVerticesFromGeometry(geometry);
      const closestVertex: Coordinate = vertices.getClosestPoint(coordinate);
      return [closestVertex, olFeature];
    }
    return undefined;
  }

  /**
   Deletes the vertex the user interacted with last via the modify interaction. Handled events are defined by the
   modify option properties 'condition' and 'insertVertexCondition'.
   */
  private removeLastInteractedVertex(): boolean | undefined {
    return this.modify?.removePoint();
  }

  /**
   * Adds features to the drawing source if they are missing and updates their style each time a property changes.
   * Adding them to the source is only necessary if the feature originates from a deserialized state and not
   * from a drawing action in the map.
   *
   * @param {DrawingFeature[]} dFeatures - An array of `DrawingFeature` objects to be added.
   */
  addFeatures(dFeatures: DrawingFeature[]) {
    dFeatures.forEach((df) => {
      let olFeature = this.getOlFeatureFromDrawingSource(df.id);
      if (olFeature === null) {
        olFeature = this.createOlFeature(df);
        this.drawingSource.addFeature(olFeature);
      }
      df.onChange = (df: DrawingFeature) => olFeature!.setStyle((f) => this.getStyle(df, f as Feature<Geometry>));
      df.onChange(df);
    });
  }

  /**
   * Deletes the provided features from the drawing source.
   *
   * @param {DrawingFeature[]} dFeatures - The list of features to be deleted.
   */
  deleteFeatures(dFeatures: DrawingFeature[]) {
    dFeatures.forEach((df) => {
      const toRemove = this.getOlFeatureFromDrawingSource(df.id);
      if (toRemove !== null) {
        this.drawingSource.removeFeature(toRemove);
      }
    });
    this.updateModifiableFeatures();
  }

  /**
   * Restrict modify interaction to the currently selected features via updating the features collection
   */
  private updateModifiableFeatures() {
    const selectedDrawingFeatures = this.drawingState.features.filter((f) => f.selected);
    this.modifiableFeatures.clear();
    selectedDrawingFeatures.forEach((df: DrawingFeature) => {
      const olFeature = this.getOlFeatureFromDrawingSource(df.id);
      if (olFeature) {
        this.modifiableFeatures.push(olFeature);
      }
    });
    // Only activate interaction if there are features to modify
    if (this.modifiableFeatures.getLength() > 0) {
      this.addEditInteractions();
    } else {
      this.removeEditInteractions();
    }
  }

  /**
   * Handles the addition of a feature to the vector source. This method is triggered when a new feature is drawn
   * and added to the vector source at end of the draw interaction.
   * It creates a `DrawingFeature` to save in the state, containing a unique id and the feature geometry as a geojson.
   * To identify the ol feature in the map, it receives the same id as the `DrawingFeature`.
   *
   * @param {VectorSourceEvent} e - The add-feature event.
   */
  onFeatureAdded(e: VectorSourceEvent) {
    // Cancel if the shape or feature isn't defined or the feature is already in the state
    if (this.currentShape === null || !e.feature || this.isOlFeatureInState(e.feature)) {
      return;
    }
    const olFeature = e.feature;
    const dFeature = new DrawingFeature(this.currentShape);

    olFeature.setId(dFeature.id);

    dFeature.geojson = DrawingFeature.geojsonFromOlFeature(olFeature, dFeature.type);
    dFeature.addToState();
  }

  private getOlFeatureFromDrawingSource(id: string): Feature<Geometry> | null {
    return this.drawingSource.getFeatureById(id);
  }

  private isOlFeatureInState(feature: Feature<Geometry>): boolean {
    if (!feature.getId()) {
      return false;
    }
    return this.drawingState.features.map((f) => f.id).includes(feature.getId() as string);
  }

  createOlFeature(dFeature: DrawingFeature): Feature<Geometry> {
    const geometry = (dFeature.geojson as any).geometry;
    let olFeature;
    if (geometry.type == 'Disk') {
      olFeature = new Feature(new CircleGeom(geometry.center, geometry.radius));
    } else {
      olFeature = new Feature(new GeoJSON().readFeatures(dFeature.geojson)[0].getGeometry());
    }
    olFeature.setId(dFeature.id);
    olFeature.setStyle((f) => this.getStyle(dFeature, f as Feature<Geometry>));
    return olFeature;
  }

  setFixedLength(length: number) {
    this.fixedLength = Number.isNaN(length) ? 0 : length;
  }

  createLineStringFixedLength(coordinates: SketchCoordType, geom: SimpleGeometry) {
    fixLastLength(this.fixedLength, coordinates);
    geom = geom ?? new LineString(coordinates as Coordinate[]);
    geom.setCoordinates(coordinates);
    return geom;
  }

  createSquareFixedLength(coordinates: SketchCoordType, geom: SimpleGeometry, proj: Projection) {
    fixLastLength(this.fixedLength, coordinates, Math.SQRT2);
    return createRegularPolygon(4)(coordinates, geom, proj);
  }

  createPolygonFixedLength(coordinates: SketchCoordType, geom: SimpleGeometry) {
    const coord = coordinates[0] as Coordinate[];
    fixLastLength(this.fixedLength, coord);
    geom = geom ?? new Polygon([coord]);
    geom.setCoordinates([coord]);
    return geom;
  }

  createDiskFixedLength(coordinates: SketchCoordType, geom: SimpleGeometry) {
    const coord = coordinates as Coordinate[];
    fixLastLength(this.fixedLength, coord);
    geom = geom ?? new CircleGeom(coord[0], getDistance(coord));
    (geom as CircleGeom).setCenterAndRadius(coord[0], getDistance(coord));
    return geom;
  }

  addDrawInteraction(tool: DrawingShape) {
    this.removeDrawInteraction();
    // Block feature selection while drawing by registering 'map.select' exclusively
    this.userInteractionManager.registerListener('map.select', true, this.toolName);

    this.currentShape = tool;
    let geomFunction = undefined;
    let olTool;

    switch (tool) {
      case DrawingShape.Point:
        olTool = 'Point';
        break;
      case DrawingShape.Polyline:
        olTool = 'LineString';
        geomFunction = this.createLineStringFixedLength.bind(this);
        break;
      case DrawingShape.Polygon:
        olTool = 'Polygon';
        geomFunction = this.createPolygonFixedLength.bind(this);
        break;
      case DrawingShape.Disk:
        olTool = 'Circle';
        geomFunction = this.createDiskFixedLength.bind(this);
        break;
      case DrawingShape.Square:
        olTool = 'Circle';
        geomFunction = this.createSquareFixedLength.bind(this);
        break;
      case DrawingShape.Rectangle:
        olTool = 'Circle';
        geomFunction = createBox();
        break;
      case DrawingShape.FreehandPolyline:
        olTool = 'LineString';
        break;
      case DrawingShape.FreehandPolygon:
        olTool = 'Polygon';
        break;
    }

    this.draw = new Draw({
      source: this.drawingSource,
      type: olTool as Type,
      freehand: tool == DrawingShape.FreehandPolyline || tool == DrawingShape.FreehandPolygon,
      stopClick: true,
      geometryFunction: geomFunction,
      // Default condition for ol drawing is noModifierKeys(e)
      // canExecute: If another tool is exclusively drawing, this interaction will be prevented from reacting
      condition: (e) => noModifierKeys(e) && this.canExecute('map.draw'),
      style: (f) => this.getStyle(new DrawingFeature(tool, {}, ''), f as Feature<Geometry>)
    });
    this.draw.on('drawend', () => {
      this.draw?.removeLastPoint();
      this.draw?.finishDrawing();
    });
    this.map.olMap.addInteraction(this.draw);

    this.addSnapInteraction();
  }

  centerViewOnFeature(drawingFeature: DrawingFeature) {
    const olFeature = this.getOlFeatureFromDrawingSource(drawingFeature.id);
    const extent = olFeature?.getGeometry()?.getExtent();
    if (extent) {
      const minResolution = ConfigManager.getInstance().Config.search.minResolution;
      MapManager.getInstance().zoomToExtent(extent, minResolution);
    }
  }

  // TODO Move as much parameters as possible into DrawingFeature
  getStyle(dFeature: DrawingFeature, olFeature: Feature<Geometry>) {
    const geometry = olFeature.getGeometry() as Geometry;
    const measureFont = 'Bold ' + dFeature.measureFontSize + 'px/1 ' + dFeature.font;
    const nameFont = 'Bold ' + dFeature.nameFontSize + 'px/1 ' + dFeature.font;
    const measureColor = 'rgba(0, 0, 0, 0.4)';
    const defaultStyle = new Style({
      // need to explicitly mention lineCap: round, so that MapfishPrint does not use butted as default
      stroke: new Stroke({
        color: dFeature.strokeColor,
        width: dFeature.strokeWidth,
        lineCap: 'round',
        lineDash: getLineStroke(dFeature.lineStroke, dFeature.strokeWidth)
      }),
      fill: new Fill({ color: dFeature.fillColor }),
      image: new Circle({
        radius: dFeature.strokeWidth, // Points are using default stroke parameters
        fill: new Fill({ color: dFeature.strokeColor })
      }),
      text: new Text({
        text: dFeature.displayName ? dFeature.name : '',
        font: nameFont,
        textBaseline: 'bottom',
        offsetY: dFeature.type == DrawingShape.Point ? 2 * dFeature.nameFontSize : 1.2 * dFeature.nameFontSize,
        fill: new Fill({ color: dFeature.nameColor })
      })
    });

    const labelStyle = new Style({
      text: new Text({
        font: measureFont,
        padding: [2, 2, 2, 2],
        textBaseline: 'bottom',
        offsetY: -1 * dFeature.nameFontSize,
        fill: new Fill({ color: dFeature.measureColor })
      }),
      image: new RegularShape({
        radius: 6,
        points: 3,
        angle: Math.PI,
        displacement: [0, 8],
        fill: new Fill({ color: measureColor })
      })
    });

    const styles = [defaultStyle];

    const addLabel = (position: Point, text: string) => {
      if (text != '') {
        const style = labelStyle.clone();
        style.setGeometry(position);
        style.getText()!.setText(text);
        styles.push(style);
      }
    };

    // If the shape is being constructed (ex. it is a polygon for which only two points are placed yet)
    if (geometry.getType() == 'LineString') {
      if (dFeature.type !== DrawingShape.Polyline && dFeature.type !== DrawingShape.FreehandPolyline) {
        return [];
      }

      // arrows
      const createArrowStyle = function (pos: number[], rot: number) {
        const view = MapManager.getInstance().getMap().getView();
        const proj = view.getProjection();
        const res = view.getResolution();
        const pointRes = getPointResolution(proj, res!, pos);
        const arrowLength = 5 * pointRes * dFeature.strokeWidth;
        const arrowGeom: Geometry = new LineString([
          [pos[0] - 1.2 * arrowLength, pos[1] - arrowLength],
          pos,
          [pos[0] - 1.2 * arrowLength, pos[1] + arrowLength]
        ]);
        arrowGeom.rotate(rot, pos);
        const stroke = defaultStyle.getStroke()?.clone();
        stroke?.setLineDash(null);
        return new Style({
          geometry: arrowGeom,
          stroke: stroke || undefined
        });
      };

      const pushArrowStyles = function (
        start: number[],
        end: number[],
        startArrow: boolean,
        endArrow: boolean,
        ratio: number
      ) {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const p1 = [start[0] + ratio * dx, start[1] + ratio * dy];
        const p2 = [end[0] - ratio * dx, end[1] - ratio * dy];

        // arrows
        if (startArrow) {
          const rotation = Math.atan2(-dy, -dx);
          styles.push(createArrowStyle(p1, rotation));
        }
        if (endArrow) {
          const rotation = Math.atan2(dy, dx);
          styles.push(createArrowStyle(p2, rotation));
        }
      };
      // create arrow styles according to spec
      if (dFeature.arrowStyle !== 'none') {
        const doStartArrow = dFeature.arrowStyle == 'start' || dFeature.arrowStyle == 'both';
        const doEndArrow = dFeature.arrowStyle == 'end' || dFeature.arrowStyle == 'both';
        if (dFeature.arrowPosition === 'each') {
          (geometry as LineString).forEachSegment(function (start, end) {
            pushArrowStyles(start, end, doStartArrow, doEndArrow, 0);
          });
        } else if (dFeature.arrowPosition === 'mid') {
          (geometry as LineString).forEachSegment(function (start, end) {
            pushArrowStyles(start, end, doStartArrow, doEndArrow, 0.4);
          });
        } else if (dFeature.arrowPosition === 'whole') {
          const coords = (geometry as LineString).getCoordinates();
          pushArrowStyles(coords[0], coords[1], doStartArrow, false, 0);
          pushArrowStyles(coords[coords.length - 2], coords[coords.length - 1], false, doEndArrow, 0);
        }
      }
    }

    if (dFeature.type == DrawingShape.Point || geometry.getType() === 'Point') {
      addLabel(geometry as Point, dFeature.getCoordText((geometry as Point).getCoordinates()));
    } else if (dFeature.type == DrawingShape.Polyline) {
      (geometry as LineString).forEachSegment((a, b) =>
        addLabel(getHalfPoint([a, b]), dFeature.getLengthText(getDistance([a, b])))
      );
    } else if (dFeature.type == DrawingShape.Polygon) {
      const polygon = geometry as Polygon;
      const segments = this.ensurePolygonIsProperlyClosed(polygon);
      new LineString(segments).forEachSegment((a, b) =>
        addLabel(getHalfPoint([a, b]), dFeature.getLengthText(getDistance([a, b])))
      );
      addLabel(polygon.getInteriorPoint(), dFeature.getAreaText(getArea(polygon)));
    } else if (dFeature.type == DrawingShape.Disk) {
      const radius = (geometry as CircleGeom).getRadius();
      const center = (geometry as CircleGeom).getCenter();
      const radiusLine = [center, [center[0] + radius, center[1]]];
      const radiusLineStyle = defaultStyle.clone();
      radiusLineStyle.setStroke(new Stroke({ color: measureColor, width: dFeature.strokeWidth }));
      radiusLineStyle.getText()!.setText('');
      radiusLineStyle.setGeometry(dFeature.displayMeasure ? new LineString(radiusLine) : new LineString([]));
      styles.push(radiusLineStyle);
      addLabel(getHalfPoint(radiusLine), dFeature.getLengthText(radius));
    } else if (dFeature.type == DrawingShape.FreehandPolygon) {
      const polygon = geometry as Polygon;
      this.ensurePolygonIsProperlyClosed(polygon);
      addLabel(polygon.getInteriorPoint(), dFeature.getAreaText(getArea(polygon)));
      addLabel(
        new Point(polygon.getCoordinates()[0][0]),
        dFeature.getLengthText(getDistance(polygon.getCoordinates()[0]))
      );
    } else if (dFeature.type == DrawingShape.FreehandPolyline) {
      const line = geometry as LineString;
      addLabel(new Point(line.getCoordinates()[0]), dFeature.getLengthText(getDistance(line.getCoordinates())));
    } else if (dFeature.type == DrawingShape.Rectangle) {
      const rect = geometry as Polygon;
      const segment1 = [rect.getCoordinates()[0][0], rect.getCoordinates()[0][1]];
      const segment2 = [rect.getCoordinates()[0][1], rect.getCoordinates()[0][2]];
      addLabel(getHalfPoint(segment1), dFeature.getLengthText(getDistance(segment1)));
      addLabel(getHalfPoint(segment2), dFeature.getLengthText(getDistance(segment2)));
      addLabel(rect.getInteriorPoint(), dFeature.getAreaText(getArea(rect)));
    } else if (dFeature.type == DrawingShape.Square) {
      const square = geometry as Polygon;
      const segment = [square.getCoordinates()[0][0], square.getCoordinates()[0][1]];
      addLabel(getHalfPoint(segment), dFeature.getLengthText(getDistance(segment)));
      addLabel(square.getInteriorPoint(), dFeature.getAreaText(getArea(square)));
    }

    if (dFeature.selected) {
      const vertexStyle = dFeature.getVertexStyle();
      // Add a node style to every vertex of the geometry
      vertexStyle.setGeometry(function (f) {
        const geom = f?.getGeometry();
        if (geom && geom instanceof Geometry) {
          return extractVerticesFromGeometry(geom);
        }
      });
      styles.push(vertexStyle);
    }

    return styles;
  }

  ensurePolygonIsProperlyClosed(polygon: Polygon) {
    const coordinates = polygon.getCoordinates()[0];
    let segments = [...coordinates];
    if (coordinates.length > 2 && coordinates[0][0] != coordinates[coordinates.length - 1][0]) {
      segments = [...coordinates, coordinates[0]];
      polygon.setCoordinates([segments]);
    }
    return segments;
  }

  private removeDrawInteraction() {
    if (this.draw) {
      this.map.olMap.removeInteraction(this.draw);
      this.state.snapActive = false;
      this.draw = null;
    }
    // Reactivate feature selection by unregistering 'map.select'
    this.userInteractionManager.unregisterListener('map.select', this.toolName);
  }

  private removeModifyInteraction() {
    if (this.modify) {
      this.map.olMap.removeInteraction(this.modify);
      this.modify = null;
    }
  }

  private removeSnapInteraction() {
    if (this.snap) {
      this.map.olMap.removeInteraction(this.snap);
      this.snap = null;
    }
    this.state.snapActive = false;
  }

  private removeEditContextMenu() {
    if (this.editContextMenu) {
      this.editContextMenu.remove();
      this.editContextMenu = null;
    }
  }

  registerInteractions() {
    this.userInteractionManager.registerListener('map.draw', true, this.toolName);
    this.userInteractionManager.registerListener('map.modify', true, this.toolName);
    this.userInteractionManager.registerListener('map.snap', true, this.toolName);
  }

  unregisterInteractions() {
    this.removeDrawInteraction();
    this.removeEditInteractions();
    this.userInteractionManager.unregisterListener('map.draw', this.toolName);
    this.userInteractionManager.unregisterListener('map.modify', this.toolName);
    this.userInteractionManager.unregisterListener('map.snap', this.toolName);
  }

  private canExecute(event: GgUserInteractionEvent): boolean {
    return this.userInteractionManager.canListenerExecute(event, this.toolName);
  }
}
