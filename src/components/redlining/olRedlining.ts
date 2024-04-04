import { MapComponent } from '../main';

import ComponentManager from '../../tools/state/componentManager';

import { Geometry, LineString, Point, Polygon, Circle as CircleGeom } from 'ol/geom';
import { Collection, Feature } from 'ol';
import { createBox, createRegularPolygon } from 'ol/interaction/Draw';
import { Type } from 'ol/geom/Geometry';
import { Style, Stroke, Text, Fill, Circle, RegularShape } from 'ol/style';
import { Modify, Snap, Draw } from 'ol/interaction';
import VectorSource, { VectorSourceEvent } from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { getArea, getLength } from 'ol/sphere.js';
import GeoJSON from 'ol/format/GeoJSON';

import RedliningFeature, { RedliningShape } from './redliningFeature';

// Global required because the ol Draw tool creates a new ol Feature without the possibility of giving it the GeoGirafe shape
let currentShape: RedliningShape | null = null;

export default class OlRedlining {
  map: MapComponent;

  redliningFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  redliningSource!: VectorSource;
  redliningLayer: VectorLayer<VectorSource> | null = null;
  draw: Draw | null = null;
  snap!: Snap;

  constructor() {
    this.map = ComponentManager.getInstance().getComponents(MapComponent)[0];

    // Create vector source for drawing
    this.redliningSource = new VectorSource({ features: this.redliningFeaturesCollection });
    this.redliningSource.on('addfeature', (e) => this.onFeatureAdded(e));

    this.redliningLayer = new VectorLayer({
      properties: {
        addToPrintedLayers: true
      },
      source: this.redliningSource
    });
    this.redliningLayer.setZIndex(1001);
    this.redliningLayer.set('altitudeMode', 'clampToGround');

    this.map.olMap.addLayer(this.redliningLayer);
    this.registerEvents();
  }

  addFeature(feature: RedliningFeature) {
    let olFeature: Feature;
    // As GeoJson does not support disk, we check for our own case.
    // We allow the any type, to avoid defining a generic type for all GeoJson standard + our implementation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geojson = feature.geojson as any;
    if (geojson.geometry.type == 'Disk') {
      olFeature = new Feature(new CircleGeom(geojson.geometry.center, geojson.geometry.radius));
    } else {
      const olFeatureLike = new GeoJSON().readFeatures(feature.geojson)[0];
      olFeature = new Feature(olFeatureLike.getGeometry());
    }
    this.redliningSource.addFeature(olFeature);
    const updateStyle = () => olFeature.setStyle(this.getStyle(feature, olFeature.getGeometry() as Geometry));
    feature.onNameChange(updateStyle);
    feature.onFillColorChange(updateStyle);
    feature.onStrokeColorChange(updateStyle);
    feature.onStrokeWidthChange(updateStyle);
    feature.onFontSizeChange(updateStyle);
    feature.onRemove(() => this.redliningFeaturesCollection.remove(olFeature));
    feature.update();
  }

  onFeatureAdded(e: VectorSourceEvent) {
    if (e.feature && currentShape !== null) {
      const olFeature = e.feature;
      let geoJson = {};
      // GeoJson does not support disks, so we create our own definition
      if (currentShape == RedliningShape.Disk) {
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
      const newFeature = new RedliningFeature(currentShape, geoJson);
      const updateStyle = () => olFeature.setStyle(this.getStyle(newFeature, olFeature.getGeometry() as Geometry));
      newFeature.onNameChange(updateStyle);
      newFeature.onFillColorChange(updateStyle);
      newFeature.onStrokeColorChange(updateStyle);
      newFeature.onStrokeWidthChange(updateStyle);
      newFeature.onFontSizeChange(updateStyle);
      newFeature.onRemove(() => this.redliningFeaturesCollection.remove(olFeature));
      newFeature.update();
      newFeature.addToState();
    }
  }

  onFeaturesChanged(oldFeatures: RedliningFeature[], newFeatures: RedliningFeature[]) {
    let deletedFeatures: RedliningFeature[] = [];
    if (Array.isArray(newFeatures) && Array.isArray(oldFeatures)) {
      deletedFeatures = oldFeatures.filter((f) => !newFeatures.includes(f));
    } else if (oldFeatures != undefined) {
      deletedFeatures.push(...oldFeatures);
    }
    deletedFeatures.forEach((f) => f.remove());
  }

  deleteFeature(feature: Feature) {
    const toRemove = this.redliningFeaturesCollection.getArray().find((f) => f.getId() === feature.getId());
    if (toRemove != undefined) {
      this.redliningFeaturesCollection.remove(toRemove!);
    }
  }

  activateRedliningTool(tool: RedliningShape) {
    this.deactivateRedliningTool();
    let geometryFunction = undefined;
    let freehand = false;
    let olTool;

    switch (tool) {
      case RedliningShape.Point:
        olTool = 'Point';
        break;
      case RedliningShape.Polyline:
        olTool = 'LineString';
        break;
      case RedliningShape.Polygon:
        olTool = 'Polygon';
        break;
      case RedliningShape.Disk:
        olTool = 'Circle';
        break;
      case RedliningShape.Square:
        olTool = 'Circle';
        geometryFunction = createRegularPolygon(4);
        break;
      case RedliningShape.Rectangle:
        olTool = 'Circle';
        geometryFunction = createBox();
        break;
      case RedliningShape.FreehandPolyline:
        olTool = 'LineString';
        freehand = true;
        break;
      case RedliningShape.FreehandPolygon:
        olTool = 'Polygon';
        freehand = true;
        break;
    }

    currentShape = tool;

    this.draw = new Draw({
      source: this.redliningSource,
      type: olTool as Type,
      freehand: freehand,
      geometryFunction: geometryFunction,
      style: (featureLike) => this.getStyle(new RedliningFeature(tool), featureLike.getGeometry() as Geometry)
    });
    this.map.olMap.addInteraction(this.draw);
    this.map.olMap.addInteraction(new Modify({ source: this.redliningSource }));
    this.snap = new Snap({ source: this.redliningSource });
    this.map.olMap.addInteraction(this.snap);
  }

  deactivateRedliningTool() {
    if (this.draw) {
      this.map.olMap.removeInteraction(this.draw);
    }
    if (this.snap) {
      this.map.olMap.removeInteraction(this.snap);
    }
  }

  registerEvents() {
    this.map.stateManager.subscribe(
      'extendedState.redlining.activeTool',
      (_oldTool: string | null, newTool: RedliningShape | null) =>
        newTool === null ? this.deactivateRedliningTool() : this.activateRedliningTool(newTool)
    );
    this.map.stateManager.subscribe(
      'extendedState.redlining.features',
      (previous: RedliningFeature[], current: RedliningFeature[]) => this.onFeaturesChanged(previous, current)
    );
  }

  removeLastPoint() {
    this.draw!.removeLastPoint();
  }

  // TODO Move as much parameters as possible into RedliningFeature
  getStyle(feature: RedliningFeature, geometry: Geometry) {
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
      feature.type !== RedliningShape.Polyline &&
      feature.type !== RedliningShape.FreehandPolyline
    ) {
      return [];
    }

    if (feature.type == RedliningShape.Point || geometry.getType() === 'Point') {
      const point = geometry as Point;
      const coord = point.getCoordinates();
      addLabel(point, RedliningFeature.round(coord[0]) + ' ; ' + RedliningFeature.round(coord[1]));
    } else if (feature.type == RedliningShape.Polyline) {
      (geometry as LineString).forEachSegment((a, b) => {
        const segment = new LineString([a, b]);
        addLabel(new Point(segment.getCoordinateAt(0.5)), RedliningFeature.formatDistance(getLength(segment)));
      });
    } else if (feature.type == RedliningShape.Polygon) {
      const polygon = geometry as Polygon;
      new LineString(polygon.getCoordinates()[0]).forEachSegment((a, b) => {
        const segment = new LineString([a, b]);
        addLabel(new Point(segment.getCoordinateAt(0.5)), RedliningFeature.formatDistance(getLength(segment)));
      });
      addLabel(polygon.getInteriorPoint(), RedliningFeature.formatArea(getArea(polygon)));
    } else if (feature.type == RedliningShape.Disk) {
      const circle = geometry as CircleGeom;
      const radius = circle.getRadius();
      const center = circle.getCenter();
      const radiusLine = new LineString([center, [center[0] + radius, center[1]]]);
      const radiusLineStyle = defaultStyle.clone();
      radiusLineStyle.getText()!.setText('');
      radiusLineStyle.setGeometry(radiusLine);
      styles.push(radiusLineStyle);
      addLabel(new Point(radiusLine.getCoordinateAt(0.5)), RedliningFeature.formatDistance(radius));
    } else if (feature.type == RedliningShape.FreehandPolygon) {
      const polygon = geometry as Polygon;
      addLabel(polygon.getInteriorPoint(), RedliningFeature.formatArea(getArea(polygon)));
      let lengthSum = 0;
      const line = new LineString(polygon.getCoordinates()[0]);
      line.forEachSegment((a, b) => {
        lengthSum += getLength(new LineString([a, b]));
      });
      addLabel(new Point(line.getCoordinates()[0]), RedliningFeature.formatDistance(lengthSum));
    } else if (feature.type == RedliningShape.FreehandPolyline) {
      const line = geometry as LineString;
      let lengthSum = 0;
      line.forEachSegment((a, b) => {
        lengthSum += getLength(new LineString([a, b]));
      });
      addLabel(new Point(line.getCoordinates()[0]), RedliningFeature.formatDistance(lengthSum));
    } else if (feature.type == RedliningShape.Rectangle) {
      const rect = geometry as Polygon;
      const segment1 = new LineString([rect.getCoordinates()[0][0], rect.getCoordinates()[0][1]]);
      addLabel(new Point(segment1.getCoordinateAt(0.5)), RedliningFeature.formatDistance(getLength(segment1)));
      const segment2 = new LineString([rect.getCoordinates()[0][1], rect.getCoordinates()[0][2]]);
      addLabel(new Point(segment2.getCoordinateAt(0.5)), RedliningFeature.formatDistance(getLength(segment2)));
      addLabel(rect.getInteriorPoint(), RedliningFeature.formatArea(getArea(rect)));
    } else if (feature.type == RedliningShape.Square) {
      const square = geometry as Polygon;
      const segment = new LineString([square.getCoordinates()[0][0], square.getCoordinates()[0][1]]);
      addLabel(new Point(segment.getCoordinateAt(0.5)), RedliningFeature.formatDistance(getLength(segment)));
      addLabel(square.getInteriorPoint(), RedliningFeature.formatArea(getArea(square)));
    }
    return styles;
  }
}
