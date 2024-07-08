import MapComponent from '../map/component';

import StateManager from '../../tools/state/statemanager';
import State from '../../tools/state/state';

import { Collection, Feature } from 'ol';
import { Geometry, LineString, Point, Polygon, Circle as CircleGeom, SimpleGeometry } from 'ol/geom';
import { createBox, createRegularPolygon } from 'ol/interaction/Draw';
import { Type } from 'ol/geom/Geometry';
import { Style, Stroke, Text, Fill, Circle, RegularShape } from 'ol/style';
import { Modify, Snap, Draw } from 'ol/interaction';
import VectorSource, { VectorSourceEvent } from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { getArea, getLength } from 'ol/sphere.js';
import GeoJSON from 'ol/format/GeoJSON';

import DrawingFeature, { DrawingShape } from './drawingFeature';

export default class OlDrawing {
  map: MapComponent;
  state: State;
  drawingSource!: VectorSource;
  draw: Draw | null = null;
  snap!: Snap;
  currentShape: DrawingShape | null = null;
  featuresMap: Map<string, { feature: Feature<Geometry>; shape: DrawingShape }> = new Map();

  constructor(map: MapComponent) {
    this.map = map;
    this.state = StateManager.getInstance().state;
    // Create vector source for drawing
    this.drawingSource = new VectorSource({ features: new Collection() });
    this.drawingSource.on('addfeature', (e) => this.onFeatureAdded(e));

    const drawingLayer = new VectorLayer({
      properties: { addToPrintedLayers: true },
      source: this.drawingSource,
      style: (f, _) => this.getStyle(null, f as Feature<Geometry>)
    });
    drawingLayer.setZIndex(1001);
    drawingLayer.set('altitudeMode', 'clampToGround');
    this.map.olMap.addLayer(drawingLayer);

    this.map.stateManager.subscribe('extendedState.drawing.activeTool', (_oldTool, newTool) =>
      newTool === null ? this.deactivateTool() : this.activateTool(newTool)
    );
  }

  addFeatures(features: DrawingFeature[]) {
    features.forEach((feature) => {
      let olFeature = this.featuresMap.get(feature.id)?.feature;
      if (olFeature == undefined) {
        olFeature = this.createOlFeature(feature);
        this.featuresMap.set(feature.id, { feature: olFeature, shape: feature.type });
        this.drawingSource.addFeature(olFeature);
      }
      feature.onChange = (f: DrawingFeature) => olFeature.setStyle(this.getStyle(f, olFeature));
    });
  }

  deleteFeatures(features: DrawingFeature[]) {
    features.forEach((feature) => {
      const toRemove = this.featuresMap.get(feature.id)?.feature;
      if (toRemove != undefined) {
        this.drawingSource.removeFeature(toRemove);
        this.featuresMap.delete(feature.id);
      }
    });
  }

  onFeatureAdded(e: VectorSourceEvent) {
    if (e.feature && this.currentShape !== null) {
      const olFeature = e.feature;
      // If the shape is not in the state already
      if (
        !Array.from(this.featuresMap.values())
          .map((x) => x.feature)
          .includes(olFeature)
      ) {
        let geoJson = {};
        // GeoJson does not support disks, so we create our own definition
        if (this.currentShape == DrawingShape.Disk) {
          const circleGeom = olFeature.getGeometry()! as CircleGeom;
          geoJson = {
            type: 'Feature',
            geometry: {
              type: 'Disk',
              center: circleGeom.getCenter(),
              radius: circleGeom.getRadius()
            }
          };
        } else {
          geoJson = JSON.parse(new GeoJSON().writeFeature(olFeature));
        }
        const feature = new DrawingFeature(this.currentShape, geoJson);
        this.featuresMap.set(feature.id, { feature: olFeature, shape: feature.type });
        feature.addToState();
      }
    }
  }

  createOlFeature(feature: DrawingFeature) {
    let olFeature;
    const geojson = feature.geojson as any;
    if (geojson.geometry.type == 'Disk') {
      olFeature = new Feature(new CircleGeom(geojson.geometry.center, geojson.geometry.radius));
    } else {
      let olFeatureDecoded;
      if (geojson.geometry.type == 'GeometryCollection') {
        // Compatibility of feature coming from Cesium
        olFeatureDecoded = new GeoJSON().readFeatures(geojson.geometry.geometries[1])[0];
      } else {
        olFeatureDecoded = new GeoJSON().readFeatures(feature.geojson)[0];
      }
      olFeature = new Feature(olFeatureDecoded.getGeometry());
    }
    olFeature.setStyle(this.getStyle(feature, olFeature));
    return olFeature;
  }

  activateTool(tool: DrawingShape) {
    this.deactivateTool();
    this.state.selection.enabled = false;
    let geometryFunction = undefined;
    let freehand = false;
    let olTool;

    switch (tool) {
      case DrawingShape.Point:
        olTool = 'Point';
        break;
      case DrawingShape.Polyline:
        olTool = 'LineString';
        break;
      case DrawingShape.Polygon:
        olTool = 'Polygon';
        break;
      case DrawingShape.Disk:
        olTool = 'Circle';
        break;
      case DrawingShape.Square:
        olTool = 'Circle';
        geometryFunction = createRegularPolygon(4);
        break;
      case DrawingShape.Rectangle:
        olTool = 'Circle';
        geometryFunction = createBox();
        break;
      case DrawingShape.FreehandPolyline:
        olTool = 'LineString';
        freehand = true;
        break;
      case DrawingShape.FreehandPolygon:
        olTool = 'Polygon';
        freehand = true;
        break;
    }

    this.currentShape = tool;

    this.draw = new Draw({
      source: this.drawingSource,
      type: olTool as Type,
      freehand: freehand,
      geometryFunction: geometryFunction,
      style: (f) => this.getStyle(new DrawingFeature(tool, {}, ''), f as Feature<Geometry>)
    });
    this.map.olMap.addInteraction(this.draw);
    this.map.olMap.addInteraction(new Modify({ source: this.drawingSource }));
    this.snap = new Snap({ source: this.drawingSource });
    this.map.olMap.addInteraction(this.snap);
  }

  deactivateTool() {
    this.state.selection.enabled = true;
    if (this.draw) {
      this.map.olMap.removeInteraction(this.draw);
    }
    if (this.snap) {
      this.map.olMap.removeInteraction(this.snap);
    }
  }

  centerViewOnFeature(feature: DrawingFeature) {
    const olFeature = this.featuresMap.get(feature.id)?.feature;
    if (olFeature != undefined) {
      this.map.olMap.getView().fit(olFeature.getGeometry()! as SimpleGeometry);
    }
  }

  // TODO Move as much parameters as possible into DrawingFeature
  getStyle(feature: DrawingFeature | null, olFeature: Feature<Geometry>) {
    if (feature == null) {
      const shape = Array.from(this.featuresMap.values()).filter((x) => x.feature == olFeature)[0].shape;
      feature = new DrawingFeature(shape, {}, '');
    }

    const geometry = olFeature.getGeometry() as Geometry;
    const font = 'Bold ' + feature.fontSize + 'px/1 ' + feature.font;

    const defaultStyle = new Style({
      stroke: new Stroke({ color: feature.strokeColor, width: feature.strokeWidth }),
      fill: new Fill({ color: feature.fillColor }),
      image: new Circle({
        // Points are using default stroke parameters
        radius: feature.strokeWidth,
        fill: new Fill({ color: feature.strokeColor })
      }),
      text: new Text({
        text: feature.name,
        font: font
      })
    });

    const labelStyle = new Style({
      text: new Text({
        font: font,
        padding: [2, 2, 2, 2],
        textBaseline: 'bottom',
        offsetY: -12
      }),
      image: new RegularShape({
        radius: 6,
        points: 3,
        angle: Math.PI,
        displacement: [0, 8],
        fill: new Fill({
          color: 'rgba(0, 0, 0, 0.4)'
        })
      })
    });

    const styles = [defaultStyle];

    const addLabel = (position: Point, text: string) => {
      const style = labelStyle.clone();
      style.setGeometry(position);
      style.getText()!.setText(text);
      styles.push(style);
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
      const point = geometry as Point;
      const coord = point.getCoordinates();
      addLabel(point, DrawingFeature.round(coord[0]) + ' ; ' + DrawingFeature.round(coord[1]));
    } else if (feature.type == DrawingShape.Polyline) {
      (geometry as LineString).forEachSegment((a, b) => {
        const segment = new LineString([a, b]);
        addLabel(new Point(segment.getCoordinateAt(0.5)), DrawingFeature.formatDistance(getLength(segment)));
      });
    } else if (feature.type == DrawingShape.Polygon) {
      const polygon = geometry as Polygon;
      new LineString(polygon.getCoordinates()[0]).forEachSegment((a, b) => {
        const segment = new LineString([a, b]);
        addLabel(new Point(segment.getCoordinateAt(0.5)), DrawingFeature.formatDistance(getLength(segment)));
      });
      addLabel(polygon.getInteriorPoint(), DrawingFeature.formatArea(getArea(polygon)));
    } else if (feature.type == DrawingShape.Disk) {
      const circle = geometry as CircleGeom;
      const radius = circle.getRadius();
      const center = circle.getCenter();
      const radiusLine = new LineString([center, [center[0] + radius, center[1]]]);
      const radiusLineStyle = defaultStyle.clone();
      radiusLineStyle.getText()!.setText('');
      radiusLineStyle.setGeometry(radiusLine);
      styles.push(radiusLineStyle);
      addLabel(new Point(radiusLine.getCoordinateAt(0.5)), DrawingFeature.formatDistance(radius));
    } else if (feature.type == DrawingShape.FreehandPolygon) {
      const polygon = geometry as Polygon;
      addLabel(polygon.getInteriorPoint(), DrawingFeature.formatArea(getArea(polygon)));
      let lengthSum = 0;
      const line = new LineString(polygon.getCoordinates()[0]);
      line.forEachSegment((a, b) => (lengthSum += getLength(new LineString([a, b]))));
      addLabel(new Point(line.getCoordinates()[0]), DrawingFeature.formatDistance(lengthSum));
    } else if (feature.type == DrawingShape.FreehandPolyline) {
      const line = geometry as LineString;
      let lengthSum = 0;
      line.forEachSegment((a, b) => (lengthSum += getLength(new LineString([a, b]))));
      addLabel(new Point(line.getCoordinates()[0]), DrawingFeature.formatDistance(lengthSum));
    } else if (feature.type == DrawingShape.Rectangle) {
      const rect = geometry as Polygon;
      const segment1 = new LineString([rect.getCoordinates()[0][0], rect.getCoordinates()[0][1]]);
      addLabel(new Point(segment1.getCoordinateAt(0.5)), DrawingFeature.formatDistance(getLength(segment1)));
      const segment2 = new LineString([rect.getCoordinates()[0][1], rect.getCoordinates()[0][2]]);
      addLabel(new Point(segment2.getCoordinateAt(0.5)), DrawingFeature.formatDistance(getLength(segment2)));
      addLabel(rect.getInteriorPoint(), DrawingFeature.formatArea(getArea(rect)));
    } else if (feature.type == DrawingShape.Square) {
      const square = geometry as Polygon;
      const segment = new LineString([square.getCoordinates()[0][0], square.getCoordinates()[0][1]]);
      addLabel(new Point(segment.getCoordinateAt(0.5)), DrawingFeature.formatDistance(getLength(segment)));
      addLabel(square.getInteriorPoint(), DrawingFeature.formatArea(getArea(square)));
    }
    return styles;
  }
}
