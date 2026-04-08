// SPDX-License-Identifier: Apache-2.0
import DrawingFeature, { DrawingShape, DrawingState, LineStroke } from './drawingFeature';
import MapComponent from '../map/component';
import { Collection, Feature, MapBrowserEvent } from 'ol';
import {
  Circle as CircleGeom,
  Geometry,
  LinearRing,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
  SimpleGeometry
} from 'ol/geom';
import { createBox, createRegularPolygon, SketchCoordType } from 'ol/interaction/Draw';
import { Type } from 'ol/geom/Geometry';
import { Circle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style';
import { Draw, Modify, Snap, Translate } from 'ol/interaction';
import VectorSource, { VectorSourceEvent } from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { getPointResolution, Projection } from 'ol/proj';
import { Coordinate } from 'ol/coordinate';
import { always, never, primaryAction } from 'ol/events/condition';
import { Pixel } from 'ol/pixel';
import {
  ensurePolygonIsProperlyClosed,
  getAreaOfPolygon,
  getDistance,
  getHalfPoint,
  getLabelStyle,
  getRadiusDataForCircle
} from '../../tools/utils/olutils';
import { ContextMenu, EntryInteractionType, MenuEntry } from '../map/tools/contextmenu';
import { formatCoordinates } from '../../tools/geometrytools';
import { v4 as uuidv4 } from 'uuid';
import {
  GgUserInteractionEvent,
  isAlternateMouseClick,
  isPrimaryPointerAction
} from '../../tools/state/userinteractionevent';
import IGirafeContext from '../../tools/context/icontext';
import { StyleFunction } from 'ol/style/Style';

import Transform from 'ol-ext/interaction/Transform';

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
  private readonly map: MapComponent;
  private readonly toolName: string;
  private readonly context: IGirafeContext;
  private readonly deleteHandler: (featureId: string) => void;

  modifiableFeatures: Collection<Feature> = new Collection([]);
  draw: Draw | null = null;
  modify: Modify | null = null;
  snap: Snap | null = null;
  editContextMenu: ContextMenu | null = null;
  currentShape: DrawingShape | null = null;
  fixedLineLength: number = 0;
  fixedSquareSide: number = 0;
  fixedRectangleWidth: number = 0;
  fixedRectangleHeight: number = 0;
  drawingSource: VectorSource;
  drawingLayer: VectorLayer;

  lastClosestFeature: Feature | null = null;
  translate: Translate | null = null;
  transform: Transform | null = null;

  defaultStyle: StyleFunction | undefined;

  private readonly updateGeometryInState = (olFeature: Feature) => {
    const idx = this.drawingState.features.findIndex((f) => f.id === olFeature.getId());
    const drawingFeature = this.drawingState.features[idx];
    if (idx > -1) {
      this.drawingState.features[idx].geojson = DrawingFeature.geojsonFromOlFeature(olFeature, drawingFeature.type);
    }
  };

  private get state() {
    return this.context.stateManager.state;
  }

  private get drawingState() {
    return this.state.extendedState.drawing as DrawingState;
  }

  private get config() {
    return this.context.configManager.Config;
  }

  public constructor(
    map: MapComponent,
    toolName: string,
    context: IGirafeContext,
    deleteHandler: (featureId: string) => void
  ) {
    this.map = map;
    this.toolName = toolName;
    this.context = context;
    this.deleteHandler = deleteHandler;

    this.drawingSource = new VectorSource({ features: new Collection() });
    this.drawingSource.on('addfeature', (e) => this.onFeatureAdded(e));

    this.drawingLayer = new VectorLayer({
      source: this.drawingSource,
      zIndex: 1001,
      properties: {
        addToPrintedLayers: true,
        altitudeMode: 'clampToGround'
      }
    });

    this.defaultStyle = new Modify({ source: this.drawingSource }).getOverlay().getStyleFunction();

    this.map.subscribe('extendedState.drawing.activeTool', (_oldTool, newTool) =>
      newTool === null ? this.removeDrawInteraction() : this.addDrawInteraction(newTool)
    );

    // Could be useful logic if we decide that the mobile UI should rely use a dedicated button
    // to remove a selected vetex from a polygon/line (rather than using a longpress context menu)
    // this.map.olMap.on("click", (e) => {
    //   if (this.state.interface.swipeupPanelContent === "drawing" &&
    //     this.modify?.getActive() &&
    //     this.modifiableFeatures.getArray().length > 0
    //   ) {
    //     const mapCoordinate = this.map.olMap.getCoordinateFromPixel(e.pixel);
    //     const hasEditableVertex = this.hasEditableVertexAtCoordinate(mapCoordinate)
    //     console.log("Map Coordinate:", mapCoordinate, e.pixel, hasEditableVertex);
    //   }
    // })

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
      style: new DrawingFeature(DrawingShape.Point, this.drawingState, this.config.drawing).getVertexStyle(true),
      snapToPointer: true,
      pixelTolerance: this.map.pixelTolerance
    });
    this.map.olMap.addInteraction(this.modify);

    this.modify.on('modifystart', (e) => {
      e.features.forEach((olFeature) => {
        olFeature.on('change', (e) => {
          const geometry = (e.target as Feature).getGeometry();
          if (geometry && geometry.getType() == 'Circle') {
            const circle = geometry as CircleGeom;
            const newRadius = circle.getRadius();
            const properties = circle.getProperties();
            const { pointer } = properties;
            const oldRadiusLine = new LineString([circle.getCenter(), pointer]);
            oldRadiusLine.scale(newRadius / oldRadiusLine.getLength());
            circle.setProperties({
              ...properties,
              pointer: oldRadiusLine.getLastCoordinate()
            });
          }
        });
      });
    });

    // Update the modified geometries in the state
    this.modify.on('modifyend', (e) => {
      e.features.forEach((olFeature) => this.updateGeometryInState(olFeature)); //NOSONAR(typescript:S7728) Collection<?> is a custom Implementation with custom forEach
    });
  }

  private addSnapInteraction() {
    this.removeSnapInteraction();
    // Activate snapping on all existing drawing shapes
    this.snap = new Snap({ source: this.drawingSource, pixelTolerance: this.map.pixelTolerance });
    this.map.olMap.addInteraction(this.snap);
  }

  private addTranslateInteraction() {
    this.removeTranslateInteraction();

    this.translate = new Translate({
      condition: (event) => {
        return this.translate != null && primaryAction(event);
      },
      layers: [this.drawingLayer]
    });
    this.map.olMap.addInteraction(this.translate);
  }

  private removeTranslateInteraction() {
    if (this.translate) {
      this.map.olMap.removeInteraction(this.translate);
      this.translate = null;
    }
  }

  private addTransformInteraction() {
    this.transform = new Transform({
      enableRotatedTransform: false,
      features: new Collection(this.lastClosestFeature ? [this.lastClosestFeature] : []),
      hitTolerance: this.map.pixelTolerance,
      translateFeature: false,
      scale: true,
      rotate: true,
      keepAspectRatio: always,
      keepRectangle: false,
      translate: false,
      stretch: false,
      pointRadius: function (f) {
        const radius = f.get('radius') || 10;
        return [radius, radius];
      }
    });
    this.map.olMap.addInteraction(this.transform);
    if (this.lastClosestFeature) {
      this.transform.select(this.lastClosestFeature, true);
      this.lastClosestFeature.changed();
    }
  }

  private removeTransformInteraction() {
    if (this.transform) {
      this.map.olMap.removeInteraction(this.transform);
      this.transform = null;
      this.lastClosestFeature?.changed();
    }
  }

  /**
   * Adds a context menu to the map with a single entry 'remove vertex'. The menu is configured to open
   * when the user does an alternate click ( = context event) on or near a vertex of a modifiable feature.
   */
  private addEditContextMenu() {
    this.removeEditContextMenu();
    const menuEntries: MenuEntry[] = [
      {
        entry: 'Remove Vertex',
        callback: (_evt: MouseEvent, mapCoordinate: Coordinate) => {
          const successful = this.removeLastInteractedVertex();
          if (!successful) {
            const errorMessage = `It's not possible to remove vertex at ${formatCoordinates(mapCoordinate, this.config.general.locale)}`;
            this.state.infobox.elements.push({
              id: uuidv4(),
              text: errorMessage,
              type: 'warning'
            });
          }
        },
        prepare: this.prepareMenuEntriesForVertex
      },
      {
        entry: 'Move Shape',
        callback: (_evt: MouseEvent, _mapCoordinate: Coordinate) => {
          if (this.lastClosestFeature) {
            this.removeModifyInteraction();
            this.addTranslateInteraction();
            this.map.olMap.on('singleclick', () => {
              this.removeTranslateInteraction();
              this.addModifyInteraction();
            });
          }
        },
        prepare: this.prepareMenuEntriesForShape
      },
      {
        entry: 'Rotate/Scale Shape',
        callback: (_evt: MouseEvent, _mapCoordinate: Coordinate) => {
          if (this.lastClosestFeature) {
            this.removeModifyInteraction();
            this.addTransformInteraction();
            this.map.olMap.on('singleclick', () => {
              this.removeTransformInteraction();
              this.addModifyInteraction();
            });
          }
        },
        prepare: this.prepareMenuEntriesForShape
      },
      {
        entry: 'Remove Shape',
        callback: (_evt: MouseEvent, _mapCoordinate: Coordinate) => {
          this.removeLastInteractedShape();
        },
        prepare: this.prepareMenuEntriesForShape
      }
    ];
    const conditionToOpen = (_evt: MouseEvent, mapCoordinate: Coordinate) => {
      if (!this.modify?.getActive() || this.modifiableFeatures.getArray().length === 0) {
        return false;
      }
      // Only proceed if there is an editable vertex under the mouse pointer
      return this.hasEditableShapeAtCoordinate(mapCoordinate) || this.hasEditableVertexAtCoordinate(mapCoordinate);
    };
    this.editContextMenu = new ContextMenu(this.context, menuEntries, true, conditionToOpen);
  }

  addEditInteractions() {
    if (!this.modify) {
      this.addModifyInteraction();
    }
    if (!this.editContextMenu) {
      this.addEditContextMenu();
    }
    // Always recreate snap interaction to get snapping behavior on latest features
    this.addSnapInteraction();
  }

  removeEditInteractions() {
    this.removeModifyInteraction();
    this.removeEditContextMenu();
    if (!this.draw) {
      this.removeSnapInteraction();
    }
  }

  private readonly prepareMenuEntriesForVertex = (_e: MouseEvent, mapCoordinate: Coordinate): EntryInteractionType => {
    return this.hasEditableVertexAtCoordinate(mapCoordinate)
      ? EntryInteractionType.ENABLED
      : EntryInteractionType.NOT_SHOWN;
  };

  private readonly prepareMenuEntriesForShape = (_e: MouseEvent, mapCoordinate: Coordinate): EntryInteractionType => {
    return this.hasEditableShapeAtCoordinate(mapCoordinate)
      ? EntryInteractionType.ENABLED
      : EntryInteractionType.NOT_SHOWN;
  };

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
      const distanceToVertex: number = Math.hypot(dx, dy);
      if (distanceToVertex < this.map.pixelTolerance) {
        return true;
      }
    }
    return false;
  }

  hasEditableShapeAtCoordinate(coordinate: Coordinate): boolean {
    const filter = (olFeature: Feature) =>
      this.modifiableFeatures.getArray().some((editFeature: Feature<Geometry>) => olFeature == editFeature);
    // Use filter to only query currently selected features
    const closestElements = this.getClosestVertexAndFeature(coordinate, filter);
    if (closestElements) {
      const closestFeature = closestElements[1];
      return closestFeature.getGeometry()?.containsXY(coordinate[0], coordinate[1]) ?? false;
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
      this.lastClosestFeature = olFeature;
      const vertices: MultiPoint = extractVerticesFromGeometry(geometry);
      const closestVertex: Coordinate = vertices.getClosestPoint(coordinate);
      return [closestVertex, olFeature];
    }
    this.lastClosestFeature = null;
    return undefined;
  }

  /**
   Deletes the vertex the user interacted with last via the modify interaction. Handled events are defined by the
   modify option properties 'condition' and 'insertVertexCondition'.
   */
  private removeLastInteractedVertex(): boolean | undefined {
    return this.modify?.removePoint();
  }

  private removeLastInteractedShape(): boolean {
    if (this.lastClosestFeature) {
      this.deleteHandler(this.lastClosestFeature.getId() as string);
      this.lastClosestFeature = null;
      return true;
    }
    return false;
  }

  /**
   * Adds features to the drawing source if they are missing and updates their style each time a property changes.
   * Adding them to the source is only necessary if the feature originates from a deserialized state and not
   * from a drawing action in the map.
   *
   * @param {DrawingFeature[]} dFeatures - An array of `DrawingFeature` objects to be added.
   */
  addFeatures(dFeatures: DrawingFeature[]) {
    for (const df of dFeatures) {
      let olFeature = this.getOlFeatureFromDrawingSource(df.id);
      if (olFeature === null) {
        olFeature = this.createOlFeature(df);
        this.drawingSource.addFeature(olFeature);
      }
      df.onChange = (df: DrawingFeature) => olFeature.setStyle((f) => this.getStyle(df, f as Feature<Geometry>));
      df.onChange(df);
    }
  }

  /**
   * Deletes the provided features from the drawing source.
   *
   * @param {DrawingFeature[]} dFeatures - The list of features to be deleted.
   */
  deleteFeatures(dFeatures: DrawingFeature[]) {
    for (const df of dFeatures) {
      const toRemove = this.getOlFeatureFromDrawingSource(df.id);
      if (toRemove !== null) {
        this.drawingSource.removeFeature(toRemove);
      }
    }
    this.updateModifiableFeatures();
  }

  /**
   * Restrict modify interaction to the currently selected features via updating the features collection
   */
  private updateModifiableFeatures() {
    const selectedDrawingFeatures = this.drawingState.features.filter((f) => f.selected);
    this.modifiableFeatures.clear();
    for (const df of selectedDrawingFeatures) {
      const olFeature = this.getOlFeatureFromDrawingSource(df.id);
      if (olFeature) {
        this.modifiableFeatures.push(olFeature);
      }
    }
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
    const dFeature = new DrawingFeature(this.currentShape, this.drawingState, this.config.drawing);

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
      const geom = new CircleGeom(geometry.center, geometry.radius);
      geom.setProperties({
        azimuth: geometry.azimuth,
        pointer: geometry.pointer
      });
      olFeature = new Feature(geom);
    } else {
      olFeature = new Feature(new GeoJSON().readFeatures(dFeature.geojson)[0].getGeometry());
    }
    olFeature.setId(dFeature.id);
    olFeature.setStyle((f) => this.getStyle(dFeature, f as Feature<Geometry>));
    return olFeature;
  }

  setFixedLineLength(length: number) {
    this.fixedLineLength = Number.isNaN(length) ? 0 : length;
  }

  setFixedSquareSide(length: number) {
    this.fixedSquareSide = Number.isNaN(length) ? 0 : length;
  }

  setFixedRectangleWidth(width: number) {
    this.fixedRectangleWidth = Number.isNaN(width) ? 0 : width;
  }

  setFixedRectangleHeight(height: number) {
    this.fixedRectangleHeight = Number.isNaN(height) ? 0 : height;
  }

  createLineStringFixedLength(coordinates: SketchCoordType, geom: SimpleGeometry) {
    this.fixLastLength(this.fixedLineLength, coordinates);
    geom = geom ?? new LineString(coordinates as Coordinate[]);
    geom.setCoordinates(coordinates);
    return geom;
  }

  createSquareFixedLength(coordinates: SketchCoordType, geom: SimpleGeometry, proj: Projection) {
    this.fixLastLength(this.fixedSquareSide, coordinates, Math.SQRT2);
    const poly = createRegularPolygon(4)(coordinates, geom, proj);
    console.log('createSquareFixedLength ' + JSON.stringify(poly.getCoordinates()));
    return poly;
  }

  createPolygonFixedLength(coordinates: SketchCoordType, geom: SimpleGeometry) {
    const coord = coordinates[0] as Coordinate[];
    this.fixLastLength(this.fixedLineLength, coord);
    geom = geom ?? new Polygon([coord]);
    geom.setCoordinates([coord]);
    return geom;
  }

  createDiskFixedLength(coordinates: SketchCoordType, geom: SimpleGeometry) {
    const coord = coordinates as Coordinate[];
    this.fixLastLength(this.fixedLineLength, coord);
    geom = geom ?? new CircleGeom(coord[0], getDistance(coord, this.state.projection));
    (geom as CircleGeom).setCenterAndRadius(coord[0], getDistance(coord, this.state.projection));
    geom.setProperties({
      azimuth: (90 - Math.atan2(coord[1][1] - coord[0][1], coord[1][0] - coord[0][0]) * (180 / Math.PI) + 360) % 360,
      pointer: coord[1]
    });
    return geom;
  }

  createRectangleFixedSides(coordinates: SketchCoordType, geom: SimpleGeometry, proj: Projection) {
    if (coordinates.length < 2) {
      geom = geom ?? createBox()(coordinates, geom, proj);
      return geom;
    }
    // If no fixed dimensions are set, behave like the normal box drawing.
    if (this.fixedRectangleWidth <= 0 && this.fixedRectangleHeight <= 0) {
      geom = geom ?? createBox()(coordinates, geom, proj);
      return createBox()(coordinates, geom, proj);
    }

    const coords = coordinates as Coordinate[];
    const start = coords[0];
    const pointer = coords[1];

    // Decide in which quadrant the user is dragging.
    const signX = pointer[0] >= start[0] ? 1 : -1;
    const signY = pointer[1] >= start[1] ? 1 : -1;

    // Convert "meters" (or whatever your getDistance returns) to map units along X and Y.
    const xUnit: Coordinate = [start[0] + 1, start[1]];
    const yUnit: Coordinate = [start[0], start[1] + 1];

    const metersPerMapUnitX = getDistance([start, xUnit], this.state.projection);
    const metersPerMapUnitY = getDistance([start, yUnit], this.state.projection);

    // Guard against division by 0 in weird edge cases.
    if (metersPerMapUnitX <= 0 || metersPerMapUnitY <= 0) {
      geom = geom ?? createBox()(coordinates, geom, proj);
      return createBox()(coordinates, geom, proj);
    }

    const dxMapUnits = (this.fixedRectangleWidth / metersPerMapUnitX) * signX;
    const dyMapUnits = (this.fixedRectangleHeight / metersPerMapUnitY) * signY;

    if (dxMapUnits != 0 && dyMapUnits != 0) {
      // Overwrite width and height
      coords[1] = [start[0] + dxMapUnits, start[1] + dyMapUnits];
    } else if (dxMapUnits != 0) {
      // Overwrite only width
      coords[1] = [start[0] + dxMapUnits, pointer[1]];
    } else if (dyMapUnits != 0) {
      // Overwrite only height
      coords[1] = [pointer[0], start[1] + dyMapUnits];
    }

    geom = geom ?? createBox()(coords, geom, proj);
    return createBox()(coords, geom, proj);
  }

  addDrawInteraction(tool: DrawingShape) {
    this.removeDrawInteraction();
    // Block feature selection while drawing by registering 'map.select' exclusively
    this.context.userInteractionManager.registerListener('map.select', true, this.toolName);

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
        geomFunction = this.createRectangleFixedSides.bind(this);
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
      condition: (e) => primaryAction(e) && this.canExecute('map.draw'),
      style: (f) =>
        this.getStyle(new DrawingFeature(tool, this.drawingState, this.config.drawing), f as Feature<Geometry>)
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
      const minResolution = this.config.search.minResolution;
      this.context.mapManager.zoomToExtent(extent, minResolution);
    }
  }

  // TODO Move as much parameters as possible into DrawingFeature
  getStyle(dFeature: DrawingFeature, olFeature: Feature<Geometry>) {
    const modifyGeometry = olFeature.get('modifyGeometry');
    const geometry = modifyGeometry ? modifyGeometry.geometry : olFeature.getGeometry();
    const measureFont = 'Bold ' + dFeature.measureFontSize + 'px/1 ' + dFeature.font;
    const nameFont = 'Bold ' + dFeature.nameFontSize + 'px/1 ' + dFeature.font;
    const measureColor = 'rgba(0, 0, 0, 0.4)';
    const defaultStyle = new Style({
      geometry: geometry,
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
        fill: new Fill({ color: dFeature.nameColor }),
        overflow: true
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
      const labelStyleToAdd = getLabelStyle(position, text, labelStyle);
      if (labelStyleToAdd) {
        styles.push(labelStyleToAdd);
      }
    };

    // If the shape is being constructed (ex. it is a polygon for which only two points are placed yet)
    if (geometry.getType() == 'LineString') {
      if (dFeature.type !== DrawingShape.Polyline && dFeature.type !== DrawingShape.FreehandPolyline) {
        return [];
      }

      // arrows
      const createArrowStyle = (pos: number[], rot: number) => {
        const view = this.context.mapManager.getMap().getView();
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

      const pushArrowStyles = (
        start: number[],
        end: number[],
        startArrow: boolean,
        endArrow: boolean,
        ratio: number
      ) => {
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
        addLabel(getHalfPoint([a, b]), dFeature.getLengthText(getDistance([a, b], this.state.projection)))
      );
    } else if (dFeature.type == DrawingShape.Polygon) {
      const polygon = geometry as Polygon;
      const segments = ensurePolygonIsProperlyClosed(polygon);
      new LineString(segments).forEachSegment((a, b) =>
        addLabel(getHalfPoint([a, b]), dFeature.getLengthText(getDistance([a, b], this.state.projection)))
      );
      addLabel(polygon.getInteriorPoint(), dFeature.getAreaText(getAreaOfPolygon(polygon, this.state.projection)));
    } else if (dFeature.type == DrawingShape.Disk) {
      if (dFeature.displayMeasure) {
        const radiusDataForCircle = getRadiusDataForCircle(
          geometry as CircleGeom,
          defaultStyle,
          new Stroke({ color: measureColor, width: dFeature.strokeWidth })
        );
        styles.push(radiusDataForCircle.style);
        const lengthText = dFeature.getLengthText(radiusDataForCircle.radius);
        const azimuthText = dFeature.getAzimuthText(geometry as CircleGeom);
        addLabel(getHalfPoint(radiusDataForCircle.radiusLine), `${lengthText}, ${azimuthText}`);
      }
    } else if (dFeature.type == DrawingShape.FreehandPolygon) {
      const polygon = geometry as Polygon;
      ensurePolygonIsProperlyClosed(polygon);
      addLabel(polygon.getInteriorPoint(), dFeature.getAreaText(getAreaOfPolygon(polygon, this.state.projection)));
      addLabel(
        new Point(polygon.getCoordinates()[0][0]),
        dFeature.getLengthText(getDistance(polygon.getCoordinates()[0], this.state.projection))
      );
    } else if (dFeature.type == DrawingShape.FreehandPolyline) {
      const line = geometry as LineString;
      addLabel(
        new Point(line.getCoordinates()[0]),
        dFeature.getLengthText(getDistance(line.getCoordinates(), this.state.projection))
      );
    } else if (dFeature.type == DrawingShape.Rectangle) {
      const rect = geometry as Polygon;
      const segment1 = [rect.getCoordinates()[0][0], rect.getCoordinates()[0][1]];
      const segment2 = [rect.getCoordinates()[0][1], rect.getCoordinates()[0][2]];
      addLabel(getHalfPoint(segment1), dFeature.getLengthText(getDistance(segment1, this.state.projection)));
      addLabel(getHalfPoint(segment2), dFeature.getLengthText(getDistance(segment2, this.state.projection)));
      addLabel(rect.getInteriorPoint(), dFeature.getAreaText(getAreaOfPolygon(rect, this.state.projection)));
    } else if (dFeature.type == DrawingShape.Square) {
      const square = geometry as Polygon;
      const segment = [square.getCoordinates()[0][0], square.getCoordinates()[0][1]];
      addLabel(getHalfPoint(segment), dFeature.getLengthText(getDistance(segment, this.state.projection)));
      addLabel(square.getInteriorPoint(), dFeature.getAreaText(getAreaOfPolygon(square, this.state.projection)));
    }

    if (dFeature.selected && this.transform == null) {
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

  private removeDrawInteraction() {
    if (this.draw) {
      this.map.olMap.removeInteraction(this.draw);
      this.draw = null;
    }
    // Reactivate feature selection by unregistering 'map.select'
    this.context.userInteractionManager.unregisterListener('map.select', this.toolName);
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
  }

  private removeEditContextMenu() {
    if (this.editContextMenu) {
      this.editContextMenu.remove();
      this.editContextMenu = null;
    }
  }

  registerInteractions() {
    this.context.userInteractionManager.registerListener('map.draw', true, this.toolName);
    this.context.userInteractionManager.registerListener('map.modify', true, this.toolName);
    this.context.userInteractionManager.registerListener('map.snap', true, this.toolName);
  }

  unregisterInteractions() {
    this.removeDrawInteraction();
    this.removeEditInteractions();
    this.context.userInteractionManager.unregisterListener('map.draw', this.toolName);
    this.context.userInteractionManager.unregisterListener('map.modify', this.toolName);
    this.context.userInteractionManager.unregisterListener('map.snap', this.toolName);
  }

  private canExecute(event: GgUserInteractionEvent): boolean {
    return this.context.userInteractionManager.canListenerExecute(event, this.toolName);
  }

  private fixLastLength(length: number, coordinates: SketchCoordType, scale: number = 1) {
    const coord = coordinates as Coordinate[];
    if (coord.length > 1 && length > 0) {
      const lastLine = [coord[coord.length - 2], coord[coord.length - 1]];
      coord[coord.length - 1] = new LineString(lastLine).getCoordinateAt(
        length / (getDistance(lastLine, this.state.projection) * scale)
      );
    }
  }
}
