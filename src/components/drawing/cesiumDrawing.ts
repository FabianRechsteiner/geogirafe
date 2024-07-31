import * as Cesium from 'cesium';
import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  EllipsoidGeodesic,
  Entity,
  ScreenSpaceEventType
} from 'cesium';
import { KML, GeoJSON } from 'ol/format';
import DrawingFeature, { DrawingShape } from './drawingFeature';
import MapComponent from '../map/component';
import StateManager from '../../tools/state/statemanager';
import ConfigManager from '../../tools/configuration/configmanager';
import State from '../../tools/state/state';
import proj4 from 'proj4';

const CLAMP_TO_GROUND = Cesium.HeightReference.CLAMP_TO_GROUND;
const positionToText = (p: Cartesian3) => p.x.toFixed(3) + ' ; ' + p.y.toFixed(3) + ' ; ' + p.z.toFixed(3);

function getLength(start: Cartesian3, end: Cartesian3) {
  return new EllipsoidGeodesic(Cartographic.fromCartesian(start), Cartographic.fromCartesian(end)).surfaceDistance;
}

function fixLastLength(length: number, coord: Cartesian3[]) {
  const pointCarto = new EllipsoidGeodesic(
    Cartographic.fromCartesian(coord[coord.length - 2]),
    Cartographic.fromCartesian(coord[coord.length - 1])
  ).interpolateUsingSurfaceDistance(length);
  coord[coord.length - 1] = Cartographic.toCartesian(pointCarto);
}

function createLabel(text: string, font: string, fill: Color = Color.fromCssColorString('#000000')) {
  return {
    text: text,
    font: font,
    pixelOffset: new Cartesian2(0.0, -15),
    fillColor: fill,
    heightReference: CLAMP_TO_GROUND
  };
}

function createPoint(color: Color) {
  return { color: color, pixelSize: 5, heightReference: CLAMP_TO_GROUND };
}

function getPolygonCenter(positions: Cartesian3[]) {
  return Cartesian3.divideByScalar(
    positions.reduce((p1, p2) => Cartesian3.add(p1, p2, new Cartesian3()), new Cartesian3()),
    positions.length,
    new Cartesian3()
  );
}

function getCallback(value: any) {
  return new CallbackProperty(value, false);
}

export default class CesiumDrawing {
  configManager: ConfigManager;
  state: State;
  activeShapePoints: Cartesian3[] = [];
  activeShapes: Entity[] | undefined = undefined;
  floatingPoint: Entity | undefined = undefined;
  scene: Cesium.Scene | undefined = undefined;
  handler: Cesium.ScreenSpaceEventHandler | undefined = undefined;
  entities: Cesium.EntityCollection | undefined = undefined;
  fixedLength: number = 0;

  constructor(map: MapComponent) {
    this.configManager = ConfigManager.getInstance();
    this.state = StateManager.getInstance().state;
    StateManager.getInstance().subscribe('globe.loaded', () => {
      if (this.state.globe.loaded) {
        this.scene = map.map3d.getCesiumScene();
        this.handler = new Cesium.ScreenSpaceEventHandler(this.scene!.canvas);
        this.entities = map.map3d.getDataSourceDisplay().defaultDataSource.entities;
        map.stateManager.subscribe('extendedState.drawing.activeTool', (_oldTool, newTool) =>
          newTool === null ? this.deactivateTool() : this.activateTool(newTool)
        );
      }
    });
  }

  setFixedLength(length: number) {
    this.fixedLength = Number.isNaN(length) ? 0 : length;
  }

  activateTool(tool: DrawingShape) {
    this.state.selection.enabled = false;
    this.handler!.setInputAction(this.addPoint(tool), ScreenSpaceEventType.LEFT_CLICK);
    this.handler!.setInputAction(this.updateShape(tool), ScreenSpaceEventType.MOUSE_MOVE);
    this.handler!.setInputAction(this.removeLastPointAndTerminateShape(tool), ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    this.floatingPoint = this.entities!.add({
      point: createPoint(Color.fromCssColorString(this.configManager.Config.drawing.defaultStrokeColor))
    });
  }

  deactivateTool() {
    this.state.selection.enabled = true;
    this.handler!.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    this.handler!.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
    this.handler!.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    if (this.floatingPoint) {
      this.entities!.remove(this.floatingPoint);
      this.floatingPoint = undefined;
    }
  }

  // Actions

  pickOnGlobe(position: Cartesian2) {
    const ray = this.scene!.camera.getPickRay(position);
    return ray == undefined ? undefined : this.scene!.globe.pick(ray, this.scene!);
  }

  removeLastPointAndTerminateShape(tool: DrawingShape) {
    return () => {
      this.activeShapePoints = this.activeShapePoints.slice(0, this.activeShapePoints.length - 1);
      this.terminateShape(tool);
    };
  }

  terminateShape(tool: DrawingShape) {
    const newCesiumEntityPoints = this.activeShapePoints.slice(0, this.activeShapePoints.length - 1);
    const newCesiumEntities = this.getShapes(tool, newCesiumEntityPoints, new DrawingFeature(tool));
    if (this.activeShapes) {
      this.activeShapes.forEach((e) => this.entities!.remove(e));
    }

    const newFeature = new DrawingFeature(tool);

    // The following code will be useful when we will remove OLCesium
    /*newCesiumEntities.forEach((e) => this.entities!.add(e));
    const updateStyle = (feature:DrawingFeature) => {
      newCesiumEntities.forEach((e) => this.entities!.remove(e));
      newCesiumEntities = this.getShapes(tool, newCesiumEntityPoints, feature);
      newCesiumEntities.forEach((e) => this.entities!.add(e));
    }
    newFeature.onChange = updateStyle;
    updateStyle(newFeature)*/

    if (tool == DrawingShape.Disk) {
      const center = Cesium.Ellipsoid.WGS84.cartesianToCartographic(
        newCesiumEntities[0].position!.getValue(Cesium.JulianDate.now())!
      );
      const centerCoord = [Cesium.Math.toDegrees(center.longitude), Cesium.Math.toDegrees(center.latitude)];
      newFeature.geojson = {
        type: 'Feature',
        geometry: {
          type: 'Disk',
          center: proj4('EPSG:4326', this.state.projection, centerCoord),
          radius: newCesiumEntities[0].ellipse?.semiMajorAxis?.getValue(Cesium.JulianDate.now())
        }
      };
      newFeature.addToState();
    } else {
      const entitiesCollection = new Cesium.EntityCollection();
      entitiesCollection.add(newCesiumEntities[0]);
      Cesium.exportKml({ entities: entitiesCollection }).then((res) => {
        const olFeatures = new KML().readFeatures((res as Cesium.exportKmlResultKml).kml, {
          dataProjection: 'EPSG:4326',
          featureProjection: this.state.projection
        });
        newFeature.geojson = JSON.parse(new GeoJSON().writeFeature(olFeatures[0]));
        const geojson = newFeature.geojson as any;
        if (geojson.geometry.type == 'GeometryCollection') {
          geojson.geometry = geojson.geometry.geometries[1];
        }
        newFeature.addToState();
      });
    }

    this.activeShapes = undefined;
    this.activeShapePoints = [];
  }

  updateShape(tool: DrawingShape) {
    return (event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const newPosition = this.pickOnGlobe(event.endPosition);
      if (newPosition != undefined && this.activeShapes != undefined) {
        if (tool == DrawingShape.FreehandPolyline || tool == DrawingShape.FreehandPolygon) {
          this.activeShapePoints.push(newPosition);
        } else {
          this.activeShapePoints[this.activeShapePoints.length - 1] = newPosition;
          if (this.fixedLength > 0 && tool != DrawingShape.Rectangle) {
            const factor = tool == DrawingShape.Square ? Math.SQRT2 / 2 : 1;
            fixLastLength(this.fixedLength * factor, this.activeShapePoints);
          }
        }
      }
      if (newPosition != undefined) {
        this.floatingPoint!.position = new Cesium.ConstantPositionProperty(newPosition);
      }
    };
  }

  addPoint(tool: DrawingShape) {
    return (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const earthPosition = this.pickOnGlobe(event.position);

      // If the cursor is pointing in the map
      if (earthPosition != undefined) {
        this.activeShapePoints.push(earthPosition);
        if (this.activeShapePoints.length === 1) {
          this.activeShapePoints.push(earthPosition); // Add a point for the one under the cursor
          this.activeShapes = this.getShapes(tool, this.activeShapePoints, new DrawingFeature(tool));
          this.activeShapes.forEach((e) => this.entities!.add(e));
        }

        // Tools that automatically terminate the shape after a fixed number of points
        if (
          (tool === DrawingShape.Point && this.activeShapePoints.length === 2) ||
          (tool === DrawingShape.Disk && this.activeShapePoints.length === 3) ||
          (tool === DrawingShape.Square && this.activeShapePoints.length === 3) ||
          (tool === DrawingShape.Rectangle && this.activeShapePoints.length === 3)
        ) {
          return this.terminateShape(tool);
        }
      }
    };
  }

  // Utility functions

  leveledCenterToMouse(pos: Cartesian3[]) {
    const localZ = Cartesian3.normalize(pos[0], new Cartesian3());
    const localX = Cartesian3.subtract(pos[1], pos[0], new Cartesian3());
    const factor = -(localX.x * localZ.x + localX.y * localZ.y + localX.z * localZ.z);
    return Cartesian3.add(localX, Cartesian3.multiplyByScalar(localZ, factor, new Cartesian3()), localX);
  }

  makeRectangle(pos1: Cartesian3, pos2: Cartesian3) {
    const pos1Carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(pos1);
    const pos2Carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(pos2);
    const pos3Carto = pos1Carto.clone();
    pos3Carto.latitude = pos2Carto.latitude;
    const pos4Carto = pos1Carto.clone();
    pos4Carto.longitude = pos2Carto.longitude;
    return [pos1, Cartographic.toCartesian(pos3Carto), pos2, Cartographic.toCartesian(pos4Carto), pos1];
  }

  makeRegularPolygon(center: Cartesian3, firstPosition: Cartesian3, nbEdges: number) {
    if (firstPosition.equals(center)) return [center];
    const centerToMouse = this.leveledCenterToMouse([center, firstPosition]);
    const localX = Cartesian3.normalize(centerToMouse, new Cartesian3());
    const localY = Cartesian3.normalize(Cartesian3.cross(center, localX, new Cartesian3()), new Cartesian3());
    const radius = Cartesian3.magnitude(centerToMouse);
    const positions: Cartesian3[] = [];
    for (let i = 0; i < 2 * Math.PI; i += (2 * Math.PI) / nbEdges) {
      const posX = Cartesian3.multiplyByScalar(localX, radius * Math.cos(i), new Cartesian3());
      const posY = Cartesian3.multiplyByScalar(localY, radius * Math.sin(i), new Cartesian3());
      positions.push(Cartesian3.add(center, Cartesian3.add(posX, posY, new Cartesian3()), new Cartesian3()));
    }
    return [...positions, positions[0]];
  }

  getPolygonArea(positions: Cartesian3[]) {
    if (positions.length < 3) {
      return 0;
    }
    const center = getPolygonCenter(positions);
    return positions
      .slice(0, -2)
      .map((_, i) => {
        const a = getLength(positions[i], positions[i + 1]);
        const b = getLength(positions[i], center);
        const c = getLength(center, positions[i + 1]);
        const s = (a + b + c) / 2;
        return Math.sqrt(s * (s - a) * (s - b) * (s - c));
      })
      .reduce((a, b) => a + b, 0);
  }

  getPolyline(positions: () => Cartesian3[], feature: DrawingFeature) {
    return {
      positions: new CallbackProperty(positions, false),
      clampToGround: true,
      width: feature.strokeWidth,
      material: Color.fromCssColorString(feature.strokeColor)
    };
  }

  getPolyLineLabels(feature: DrawingFeature, pos: Cartesian3[], font: string) {
    return pos.slice(0, -2).map(
      (_, index) =>
        new Entity({
          position: Cartesian3.lerp(pos[index], pos[index + 1], 0.5, new Cartesian3()),
          label: createLabel(feature.getLengthText(getLength(pos[index], pos[index + 1])), font)
        })
    );
  }

  getShapes(tool: DrawingShape, pos: Cartesian3[], feature: DrawingFeature) {
    const fillColor = Color.fromCssColorString(feature.fillColor);
    const strokeColor = Color.fromCssColorString(feature.strokeColor);
    const font = feature.nameFontSize + 'px' + feature.font;

    switch (tool) {
      case DrawingShape.Point:
        return [
          new Entity({
            position: pos[0],
            point: createPoint(strokeColor),
            label: createLabel(positionToText(pos[0]), font)
          })
        ];
      case DrawingShape.Polyline:
        return [
          new Entity({ polyline: this.getPolyline(() => pos, feature) }),
          ...this.getPolyLineLabels(feature, pos, font)
        ];
      case DrawingShape.Polygon:
        return [
          new Entity({
            polygon: {
              hierarchy: getCallback(() => new Cesium.PolygonHierarchy(pos)),
              material: fillColor
            },
            polyline: this.getPolyline(() => [...pos, pos[0]], feature)
          }),
          ...this.getPolyLineLabels(feature, pos, font),
          new Entity({
            position: getPolygonCenter(pos),
            label: createLabel(feature.getAreaText(this.getPolygonArea(pos)), font)
          })
        ];
      case DrawingShape.FreehandPolyline:
        return [
          new Entity({ polyline: this.getPolyline(() => pos, feature) }),
          new Entity({
            position: pos[Math.ceil(pos.length / 2)],
            label: createLabel(
              feature.getLengthText(
                pos
                  .slice(0, -1)
                  .map((_, i) => getLength(pos[i], pos[i + 1]))
                  .reduce((a, b) => a + b, 0)
              ),
              font
            )
          })
        ];
      case DrawingShape.FreehandPolygon:
        return [
          new Entity({
            polygon: {
              hierarchy: getCallback(() => new Cesium.PolygonHierarchy(pos)),
              material: fillColor
            },
            polyline: this.getPolyline(() => [...pos, pos[0]], feature)
          }),
          new Entity({
            position: getPolygonCenter([...pos]),
            label: createLabel(feature.getAreaText(this.getPolygonArea([...pos])), font)
          })
        ];
      case DrawingShape.Disk:
        return [
          new Entity({
            position: pos[0],
            ellipse: {
              semiMinorAxis: getCallback(() => Cartesian3.magnitude(this.leveledCenterToMouse(pos))),
              semiMajorAxis: getCallback(() => Cartesian3.magnitude(this.leveledCenterToMouse(pos))),
              material: fillColor
            },
            polyline: this.getPolyline(() => this.makeRegularPolygon(pos[0], pos[pos.length - 1], 300), feature),
            point: createPoint(strokeColor)
          }),
          new Entity({
            position: pos[0],
            label: createLabel(feature.getAreaText(Math.PI * Math.pow(getLength(pos[0], pos[1]), 2)), font)
          })
        ];
      case DrawingShape.Square:
        return [
          new Entity({
            polygon: {
              hierarchy: getCallback(
                () => new Cesium.PolygonHierarchy(this.makeRegularPolygon(pos[0], pos[pos.length - 1], 4))
              ),
              material: fillColor
            },
            polyline: this.getPolyline(() => this.makeRegularPolygon(pos[0], pos[pos.length - 1], 4), feature)
          }),
          new Entity({
            position: pos[0],
            label: createLabel(feature.getAreaText(Math.pow(Math.SQRT2 * getLength(pos[0], pos[1]), 2)), font)
          })
        ];
      case DrawingShape.Rectangle:
        return [
          new Entity({
            polygon: {
              hierarchy: getCallback(() => new Cesium.PolygonHierarchy(this.makeRectangle(pos[0], pos[1]))),
              material: fillColor
            },
            polyline: this.getPolyline(() => this.makeRectangle(pos[0], pos[1]), feature)
          }),
          new Entity({
            position: getPolygonCenter([...pos]),
            label: createLabel(feature.getAreaText(this.getPolygonArea(this.makeRectangle(pos[0], pos[1]))), font)
          })
        ];
      default:
        throw Error(`Unrecognized tool : ${tool}`);
    }
  }
}
