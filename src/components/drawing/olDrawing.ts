import DrawingFeature, { DrawingShape } from './drawingFeature';
import MapComponent from '../map/component';
import StateManager from '../../tools/state/statemanager';
import State from '../../tools/state/state';
import { Collection, Feature } from 'ol';
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
import { Projection } from 'ol/proj';
import { Coordinate } from 'ol/coordinate';
import { mouseOnly, never, primaryAction } from 'ol/events/condition';
import { Pixel } from 'ol/pixel';
import ConfigManager from '../../tools/configuration/configmanager';
import MapManager from '../../tools/state/mapManager';

function getLength(coordinates: Coordinate[]) {
  return new LineString(coordinates).getLength();
}

function getArea(polygon: Polygon) {
  return polygon.getArea();
}

function getHalfPoint(coordinates: Coordinate[]) {
  return new Point(new LineString(coordinates).getCoordinateAt(0.5));
}

function fixLastLength(length: number, coordinates: SketchCoordType, scale: number = 1) {
  const coord = coordinates as Coordinate[];
  if (coord.length > 1 && length > 0) {
    const lastLine = [coord[coord.length - 2], coord[coord.length - 1]];
    coord[coord.length - 1] = new LineString(lastLine).getCoordinateAt(length / (getLength(lastLine) * scale));
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
  state: State;
  drawingSource!: VectorSource;
  modifiableFeatures: Collection<Feature> = new Collection([]);
  draw: Draw | null = null;
  modify: Modify | null = null;
  snap: Snap | null = null;
  currentShape: DrawingShape | null = null;
  featuresMap: Map<string, { feature: Feature<Geometry>; shape: DrawingShape }> = new Map();
  fixedLength: number = 0;

  constructor(map: MapComponent) {
    this.map = map;
    this.state = StateManager.getInstance().state;
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
    this.map.stateManager.subscribe('extendedState.drawing.activeTool', (_oldTool, newTool) =>
      newTool === null ? this.deactivateDrawTool() : this.activateDrawTool(newTool)
    );

    // OlCesium duplicates drawn shapes when 3D view is open if its eventListener is not removed
    StateManager.getInstance().subscribe('globe.loaded', () => {
      if (this.state.globe.loaded) {
        this.drawingSource
          .getListeners('addfeature')
          ?.forEach((l) => this.drawingSource.removeEventListener('addfeature', l));
        this.drawingSource.on('addfeature', (e) => this.onFeatureAdded(e));
      }
    });

    this.addSnapInteraction();

    this.modify = new Modify({
      features: this.modifiableFeatures,
      // 'condition' needs to be set to mouseOnly instead of primaryAction so that primary and alternate clicks are registered.
      condition: mouseOnly,
      deleteCondition: never,
      insertVertexCondition: primaryAction,
      style: new DrawingFeature(1, {}, '').getVertexStyle(true),
      snapToPointer: true,
      pixelTolerance: this.map.pixelTolerance
    });
    this.map.olMap.addInteraction(this.modify);
  }

  enableAllInteractions() {
    this.draw?.setActive(true);
    this.modify?.setActive(true);
    this.snap?.setActive(true);
  }

  disableAllInteractions() {
    this.draw?.setActive(false);
    this.modify?.setActive(false);
    this.snap?.setActive(false);
  }

  hasEditableVertexAtCoordinate(coordinate: Coordinate): boolean {
    /*
    Check if there is a vertex of a selected (=editable) feature within the pixel tolerance of the clicked coordinates.
     */
    const filter = (f: Feature) =>
      this.modifiableFeatures.getArray().some((editFeature: Feature<Geometry>) => f == editFeature);
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

  getClosestVertexAndFeature(
    coordinate: Coordinate,
    filter: (f: Feature) => boolean = () => true
  ): [Coordinate, Feature<Geometry>] | undefined {
    /*
    Returns the closest vertex and feature from the drawing source. Feature source can be pre-filtered via filter function.
     */
    const feature = this.drawingSource.getClosestFeatureToCoordinate(coordinate, filter);
    const geometry = feature?.getGeometry();
    if (geometry) {
      const vertices: MultiPoint = extractVerticesFromGeometry(geometry);
      const closestVertex: Coordinate = vertices.getClosestPoint(coordinate);
      return [closestVertex, feature];
    }
    return undefined;
  }

  removeLastInteractedVertex(): boolean | undefined {
    /* 
    Deletes the vertex that the user interacted with last via the modify interaction. Handled events are defined by the
     modify option properties 'condition' and 'insertVertexCondition'.
    */
    return this.modify?.removePoint();
  }

  addFeatures(features: DrawingFeature[]) {
    features.forEach((feature) => {
      let olFeature = this.featuresMap.get(feature.id)?.feature;
      if (olFeature == undefined) {
        olFeature = this.createOlFeature(feature);
        this.featuresMap.set(feature.id, { feature: olFeature, shape: feature.type });
        this.drawingSource.addFeature(olFeature);
      }
      feature.onChange = (df: DrawingFeature) => olFeature.setStyle((f) => this.getStyle(df, f as Feature<Geometry>));
      feature.onChange(feature);
    });
  }

  deleteFeatures(features: DrawingFeature[]) {
    features.forEach((f) => {
      const toRemove = this.featuresMap.get(f.id)?.feature;
      if (toRemove != undefined) {
        this.drawingSource.removeFeature(toRemove);
        this.featuresMap.delete(f.id);
      }
    });
  }

  updateModifiableFeatures(features: DrawingFeature[]) {
    // Restricts the modify interaction to the currently selected drawing features
    this.modifiableFeatures.clear();

    features.forEach((df: DrawingFeature) => {
      const olFeature = this.featuresMap.get(df.id)?.feature;
      if (olFeature) {
        this.modifiableFeatures.push(olFeature);
      }
    });
  }

  onFeatureAdded(e: VectorSourceEvent) {
    if (e.feature && this.currentShape !== null) {
      // If the shape is not in the state already
      if (
        !Array.from(this.featuresMap.values())
          .map((x) => x.feature)
          .includes(e.feature)
      ) {
        let geoJson = {};
        // GeoJson does not support disks, so we create our own definition
        if (this.currentShape == DrawingShape.Disk) {
          const disk = e.feature.getGeometry()! as CircleGeom;
          geoJson = {
            type: 'Feature',
            geometry: {
              type: 'Disk',
              center: disk.getCenter(),
              radius: disk.getRadius()
            }
          };
        } else {
          geoJson = JSON.parse(new GeoJSON().writeFeature(e.feature));
        }
        const feature = new DrawingFeature(this.currentShape, geoJson);
        this.featuresMap.set(feature.id, { feature: e.feature, shape: feature.type });
        feature.addToState();
      }
    }
  }

  createOlFeature(feature: DrawingFeature) {
    const geometry = (feature.geojson as any).geometry;
    let olFeature;
    if (geometry.type == 'Disk') {
      olFeature = new Feature(new CircleGeom(geometry.center, geometry.radius));
    } else {
      olFeature = new Feature(new GeoJSON().readFeatures(feature.geojson)[0].getGeometry());
    }
    olFeature.setStyle((f) => this.getStyle(feature, f as Feature<Geometry>));
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
    geom = geom ?? new CircleGeom(coord[0], getLength(coord));
    (geom as CircleGeom).setCenterAndRadius(coord[0], getLength(coord));
    return geom;
  }

  activateDrawTool(tool: DrawingShape) {
    this.deactivateDrawTool();
    this.state.selection.enabled = false;
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
      condition: (e) => primaryAction(e),
      style: (f) => this.getStyle(new DrawingFeature(tool, {}, ''), f as Feature<Geometry>)
    });
    this.draw.on('drawend', () => {
      this.draw?.removeLastPoint();
      this.draw?.finishDrawing();
    });
    this.map.olMap.addInteraction(this.draw);

    this.addSnapInteraction();
  }

  deactivateDrawTool() {
    this.state.selection.enabled = true;
    if (this.draw) {
      this.map.olMap.removeInteraction(this.draw);
    }
  }

  addSnapInteraction() {
    if (this.snap) {
      this.map.olMap.removeInteraction(this.snap);
    }
    this.snap = new Snap({ source: this.drawingSource, pixelTolerance: this.map.pixelTolerance });
    this.map.olMap.addInteraction(this.snap);
  }

  centerViewOnFeature(feature: DrawingFeature) {
    const olFeature = this.featuresMap.get(feature.id)?.feature;
    const extent = olFeature?.getGeometry()?.getExtent();
    if (extent) {
      const minResolution = ConfigManager.getInstance().Config.search.minResolution;
      MapManager.getInstance().zoomToExtent(extent, minResolution);
    }
  }

  // TODO Move as much parameters as possible into DrawingFeature
  getStyle(feature: DrawingFeature | null, olFeature: Feature<Geometry>) {
    if (feature == null) {
      const shape = Array.from(this.featuresMap.values()).filter((x) => x.feature == olFeature)[0].shape;
      feature = new DrawingFeature(shape, {}, '');
    }

    const geometry = olFeature.getGeometry() as Geometry;
    const measureFont = 'Bold ' + feature.measureFontSize + 'px/1 ' + feature.font;
    const nameFont = 'Bold ' + feature.nameFontSize + 'px/1 ' + feature.font;
    const measureColor = 'rgba(0, 0, 0, 0.4)';
    const defaultStyle = new Style({
      stroke: new Stroke({ color: feature.strokeColor, width: feature.strokeWidth }),
      fill: new Fill({ color: feature.fillColor }),
      image: new Circle({
        radius: feature.strokeWidth, // Points are using default stroke parameters
        fill: new Fill({ color: feature.strokeColor })
      }),
      text: new Text({
        text: feature.displayName ? feature.name : '',
        font: nameFont,
        textBaseline: 'bottom',
        offsetY: feature.type == DrawingShape.Point ? 2 * feature.nameFontSize : 1.2 * feature.nameFontSize,
        fill: new Fill({ color: feature.nameColor })
      })
    });

    const labelStyle = new Style({
      text: new Text({
        font: measureFont,
        padding: [2, 2, 2, 2],
        textBaseline: 'bottom',
        offsetY: -1 * feature.nameFontSize,
        fill: new Fill({ color: feature.measureColor })
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
    if (
      geometry.getType() == 'LineString' &&
      feature.type !== DrawingShape.Polyline &&
      feature.type !== DrawingShape.FreehandPolyline
    ) {
      return [];
    }

    if (feature.type == DrawingShape.Point || geometry.getType() === 'Point') {
      addLabel(geometry as Point, feature.getCoordText((geometry as Point).getCoordinates()));
    } else if (feature.type == DrawingShape.Polyline) {
      (geometry as LineString).forEachSegment((a, b) =>
        addLabel(getHalfPoint([a, b]), feature.getLengthText(getLength([a, b])))
      );
    } else if (feature.type == DrawingShape.Polygon) {
      const polygon = geometry as Polygon;
      const segments = this.ensurePolygonIsProperlyClosed(polygon);
      new LineString(segments).forEachSegment((a, b) =>
        addLabel(getHalfPoint([a, b]), feature.getLengthText(getLength([a, b])))
      );
      addLabel(polygon.getInteriorPoint(), feature.getAreaText(getArea(polygon)));
    } else if (feature.type == DrawingShape.Disk) {
      const radius = (geometry as CircleGeom).getRadius();
      const center = (geometry as CircleGeom).getCenter();
      const radiusLine = [center, [center[0] + radius, center[1]]];
      const radiusLineStyle = defaultStyle.clone();
      radiusLineStyle.setStroke(new Stroke({ color: measureColor, width: feature.strokeWidth }));
      radiusLineStyle.getText()!.setText('');
      radiusLineStyle.setGeometry(feature.displayMeasure ? new LineString(radiusLine) : new LineString([]));
      styles.push(radiusLineStyle);
      addLabel(getHalfPoint(radiusLine), feature.getLengthText(radius));
    } else if (feature.type == DrawingShape.FreehandPolygon) {
      const polygon = geometry as Polygon;
      this.ensurePolygonIsProperlyClosed(polygon);
      addLabel(polygon.getInteriorPoint(), feature.getAreaText(getArea(polygon)));
      addLabel(
        new Point(polygon.getCoordinates()[0][0]),
        feature.getLengthText(getLength(polygon.getCoordinates()[0]))
      );
    } else if (feature.type == DrawingShape.FreehandPolyline) {
      const line = geometry as LineString;
      addLabel(new Point(line.getCoordinates()[0]), feature.getLengthText(getLength(line.getCoordinates())));
    } else if (feature.type == DrawingShape.Rectangle) {
      const rect = geometry as Polygon;
      const segment1 = [rect.getCoordinates()[0][0], rect.getCoordinates()[0][1]];
      const segment2 = [rect.getCoordinates()[0][1], rect.getCoordinates()[0][2]];
      addLabel(getHalfPoint(segment1), feature.getLengthText(getLength(segment1)));
      addLabel(getHalfPoint(segment2), feature.getLengthText(getLength(segment2)));
      addLabel(rect.getInteriorPoint(), feature.getAreaText(getArea(rect)));
    } else if (feature.type == DrawingShape.Square) {
      const square = geometry as Polygon;
      const segment = [square.getCoordinates()[0][0], square.getCoordinates()[0][1]];
      addLabel(getHalfPoint(segment), feature.getLengthText(getLength(segment)));
      addLabel(square.getInteriorPoint(), feature.getAreaText(getArea(square)));
    }

    if (feature.selected) {
      const vertexStyle = feature.getVertexStyle();
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
}
