// SPDX-License-Identifier: Apache-2.0
import * as Cesium from 'cesium';
import {
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  EllipsoidGeodesic,
  Entity,
  ScreenSpaceEventType,
  PolygonHierarchy
} from 'cesium';
import { KML, GeoJSON } from 'ol/format';
import DrawingFeature, { DrawingShape, DrawingState } from './drawingFeature';
import MapComponent from '../map/component';
import { GgUserInteractionEvent } from '../../tools/state/userinteractionevent';
import proj4 from 'proj4';
import IGirafeContext from '../../tools/context/icontext';

const CLAMP_TO_GROUND = Cesium.HeightReference.CLAMP_TO_GROUND;

export default class CesiumDrawing {
  toolName: string;
  activeShapePoints: Cartesian3[] = [];
  activeShapes: Entity[] = [];
  floatingPoint: Entity | undefined = undefined;
  scene: Cesium.Scene | undefined = undefined;
  handler: Cesium.ScreenSpaceEventHandler | undefined = undefined;
  entities: Cesium.EntityCollection | undefined = undefined;
  fixedLineLength: number = 0;

  private readonly context: IGirafeContext;

  private get state() {
    return this.context.stateManager.state;
  }

  private get drawingState() {
    return this.state.extendedState.drawing as DrawingState;
  }

  private get config() {
    return this.context.configManager.Config;
  }

  public constructor(map: MapComponent, toolName: string, context: IGirafeContext) {
    this.toolName = toolName;
    this.context = context;
    map.subscribe('globe.loaded', () => {
      if (this.state.globe.loaded) {
        this.scene = map.map3d.getCesiumScene();
        this.handler = new Cesium.ScreenSpaceEventHandler(this.scene!.canvas);
        this.entities = map.map3d.getDataSourceDisplay().defaultDataSource.entities;
        map.subscribe('extendedState.drawing.activeTool', (_oldTool, newTool) =>
          newTool === null ? this.deactivateTool() : this.activateTool(newTool)
        );
      }
    });
  }

  setFixedLineLength(length: number) {
    this.fixedLineLength = Number.isNaN(length) ? 0 : length;
  }

  activateTool(tool: DrawingShape) {
    if (!this.canExecute('globe.draw')) {
      return;
    }
    this.handler!.setInputAction(this.addPoint(tool), ScreenSpaceEventType.LEFT_CLICK);
    this.handler!.setInputAction(this.updateShape(tool), ScreenSpaceEventType.MOUSE_MOVE);
    this.handler!.setInputAction(this.removeLastPointAndTerminateShape(tool), ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    if (this.floatingPoint) {
      this.entities!.remove(this.floatingPoint);
    }
    this.floatingPoint = new Entity({
      position: new Cartesian3(),
      point: this.createPoint(),
      label: this.createLabel('', null, -30)
    });
    this.entities!.add(this.floatingPoint);
  }

  deactivateTool() {
    if (!this.handler) return;
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    this.handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    if (this.floatingPoint) {
      this.entities!.remove(this.floatingPoint);
    }
    this.floatingPoint = undefined;
  }

  pickOnGlobe(position: Cartesian2) {
    const ray = this.scene!.camera.getPickRay(position);
    return ray == undefined ? undefined : this.scene!.globe.pick(ray, this.scene!);
  }

  removeLastPointAndTerminateShape(tool: DrawingShape) {
    return () => {
      this.activeShapePoints = this.activeShapePoints.slice(0, -1);
      this.terminateShape(tool);
    };
  }

  terminateShape(tool: DrawingShape) {
    const newCesiumEntityPoints = this.activeShapePoints.slice(0, -1);
    const newCesiumEntities = this.getShapes(
      tool,
      newCesiumEntityPoints,
      new DrawingFeature(tool, this.drawingState, this.config.drawing)
    );
    this.activeShapes.forEach((e) => this.entities!.remove(e));

    const newFeature = new DrawingFeature(tool, this.drawingState, this.config.drawing);

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

    this.activeShapes = [];
    this.activeShapePoints = [];
  }

  fixLastLength(tool: DrawingShape, length: number, coord: Cartesian3[]) {
    if (this.fixedLineLength > 0 && tool != DrawingShape.Rectangle) {
      const factor = tool == DrawingShape.Square ? Math.SQRT2 / 2 : 1;
      const pointCarto = new EllipsoidGeodesic(
        Cartographic.fromCartesian(coord[coord.length - 2]),
        Cartographic.fromCartesian(coord[coord.length - 1])
      ).interpolateUsingSurfaceDistance(length * factor);
      coord[coord.length - 1] = Cartographic.toCartesian(pointCarto);
    }
  }

  updateShape(tool: DrawingShape) {
    return (event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const newPosition = this.pickOnGlobe(event.endPosition);
      if (newPosition) {
        if (this.activeShapes.length > 0) {
          if (tool == DrawingShape.FreehandPolyline || tool == DrawingShape.FreehandPolygon) {
            this.activeShapePoints.push(newPosition);
          } else {
            this.activeShapePoints[this.activeShapePoints.length - 1] = newPosition;
            this.fixLastLength(tool, this.fixedLineLength, this.activeShapePoints);
          }
          this.activeShapes.forEach((e) => this.entities!.remove(e));
          this.activeShapes = this.getShapes(
            tool,
            this.activeShapePoints,
            new DrawingFeature(tool, this.drawingState, this.config.drawing)
          );
          this.activeShapes.forEach((e) => this.entities!.add(e));
        }

        (this.floatingPoint?.position as Cesium.ConstantPositionProperty).setValue(newPosition);
        (this.floatingPoint?.label!.text as Cesium.ConstantProperty).setValue(
          new DrawingFeature(tool, this.drawingState, this.config.drawing).getCoordText(this.getPosition(newPosition))
        );
      }
    };
  }

  addPoint(tool: DrawingShape) {
    return (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const earthPosition = this.pickOnGlobe(event.position);
      // If the cursor is on the map
      if (earthPosition) {
        this.activeShapePoints.push(earthPosition);
        if (this.activeShapePoints.length === 1) {
          this.activeShapePoints.push(earthPosition); // Add a point for the one under the cursor
          this.activeShapes = this.getShapes(
            tool,
            this.activeShapePoints,
            new DrawingFeature(tool, this.drawingState, this.config.drawing)
          );
          this.activeShapes.forEach((e) => this.entities!.add(e));
        }
        // Tools that automatically terminate the shape after a fixed number of points
        if (
          (tool === DrawingShape.Point && this.activeShapePoints.length === 2) ||
          (tool === DrawingShape.Disk && this.activeShapePoints.length === 3) ||
          (tool === DrawingShape.Square && this.activeShapePoints.length === 3) ||
          (tool === DrawingShape.Rectangle && this.activeShapePoints.length === 3)
        ) {
          this.terminateShape(tool);
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

  makeRectangle(pos: Cartesian3[]) {
    if (pos.length < 2) {
      return [pos[0], pos[0], pos[0], pos[0]];
    }
    const pos1Carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(pos[0]);
    const pos2Carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(pos[1]);
    const pos3Carto = pos1Carto.clone();
    pos3Carto.latitude = pos2Carto.latitude;
    const pos4Carto = pos1Carto.clone();
    pos4Carto.longitude = pos2Carto.longitude;
    return [pos[0], Cartographic.toCartesian(pos3Carto), pos[1], Cartographic.toCartesian(pos4Carto), pos[0]];
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

  getShapes(tool: DrawingShape, pos: Cartesian3[], feature: DrawingFeature) {
    const strokeColor = Color.fromCssColorString(feature.strokeColor);
    const font = feature.nameFontSize + 'px' + feature.font;
    pos = pos.map((x) => x.clone()); // Cesium fonctions have side effects
    const pointLoop = [...pos, pos[0]];

    switch (tool) {
      case DrawingShape.Point:
        return [
          new Entity({
            position: pos[0],
            point: this.createPoint(strokeColor),
            label: this.createLabel(feature.getCoordText(this.getPosition(pos[0])), font)
          })
        ];
      case DrawingShape.Polyline:
        return [
          new Entity({ polyline: this.getPolyline(pos, feature) }),
          ...this.getPolyLineLabels(feature, pos, font)
        ];
      case DrawingShape.Polygon:
        return [
          this.getPolygonEntity(pos, feature),
          ...this.getPolyLineLabels(feature, pointLoop, font),
          new Entity({
            position: this.getPolygonCenter(pos),
            label: this.createLabel(pos.length < 4 ? '' : feature.getAreaText(this.getPolygonArea(pointLoop)), font)
          })
        ];
      case DrawingShape.FreehandPolyline:
        return [
          new Entity({ polyline: this.getPolyline(pos, feature) }),
          new Entity({
            position: pos[Math.ceil(pos.length / 2)],
            label: this.createLabel(
              feature.getLengthText(
                pos
                  .slice(0, -1)
                  .map((_, i) => this.getLength(pos[i], pos[i + 1]))
                  .reduce((a, b) => a + b, 0)
              ),
              font
            )
          })
        ];
      case DrawingShape.FreehandPolygon:
        return [
          this.getPolygonEntity(pos, feature),
          new Entity({
            position: this.getPolygonCenter(pos),
            label: this.createLabel(pos.length < 4 ? '' : feature.getAreaText(this.getPolygonArea(pointLoop)), font)
          }),
          new Entity({
            position: pos[Math.ceil(pos.length / 2)],
            label: this.createLabel(
              feature.getLengthText(
                pointLoop
                  .slice(0, -1)
                  .map((_, i) => this.getLength(pointLoop[i], pointLoop[i + 1]))
                  .reduce((a, b) => a + b, 0)
              ),
              font
            )
          })
        ];
      case DrawingShape.Disk:
        return [
          new Entity({
            position: pos[0],
            ellipse: {
              semiMinorAxis: new CallbackProperty(() => Cartesian3.magnitude(this.leveledCenterToMouse(pos)), false),
              semiMajorAxis: new CallbackProperty(() => Cartesian3.magnitude(this.leveledCenterToMouse(pos)), false),
              material: Color.fromCssColorString(feature.fillColor)
            },
            polyline: this.getPolyline(this.makeRegularPolygon(pos[0], pos[pos.length - 1], 300), feature),
            point: this.createPoint(strokeColor)
          }),
          new Entity({ polyline: this.getPolyline(pointLoop, feature) }),
          ...this.getPolyLineLabels(feature, pointLoop, font)
        ];
      case DrawingShape.Square: {
        const firstPosition = pos.at(-1)!;
        const vertices = this.makeRegularPolygon(pos[0], firstPosition, 4);
        return [
          this.getPolygonEntity(vertices, feature),
          ...(vertices.length >= 2 ? this.getPolyLineLabels(feature, [vertices[0], vertices[1]], font) : []),
          new Entity({
            position: pos[0],
            label: this.createLabel(feature.getAreaText(Math.pow(Math.SQRT2 * this.getLength(pos[0], pos[1]), 2)), font)
          })
        ];
      }
      case DrawingShape.Rectangle: {
        const vertices = this.makeRectangle(pos);
        return [
          this.getPolygonEntity(vertices, feature),
          ...(vertices.length >= 2
            ? this.getPolyLineLabels(feature, [vertices[0], vertices[1], vertices[2]], font)
            : []),
          new Entity({
            position: this.getPolygonCenter(pos),
            label: this.createLabel(feature.getAreaText(this.getPolygonArea(this.makeRectangle(pos))), font)
          })
        ];
      }
      default:
        throw Error(`Unrecognized tool : ${tool}`);
    }
  }

  registerInteractions() {
    this.context.userInteractionManager.registerListener('globe.select', true, this.toolName);
    this.context.userInteractionManager.registerListener('globe.draw', true, this.toolName);
  }

  unregisterInteractions() {
    this.deactivateTool();
    this.context.userInteractionManager.unregisterListener('globe.select', this.toolName);
    this.context.userInteractionManager.unregisterListener('globe.draw', this.toolName);
  }

  private canExecute(event: GgUserInteractionEvent): boolean {
    return this.context.userInteractionManager.canListenerExecute(event, this.toolName);
  }

  private getPosition(p: Cartesian3) {
    const carto = Cartographic.fromCartesian(p);
    const cartoDegree = [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude), carto.height];
    return proj4('EPSG:4326', this.state.projection, cartoDegree);
  }

  private getLength(start: Cartesian3, end: Cartesian3) {
    return new EllipsoidGeodesic(Cartographic.fromCartesian(start), Cartographic.fromCartesian(end)).surfaceDistance;
  }

  private createLabel(text: string, font: string | null = null, offset = -15, fill: Color | null = null) {
    if (font == null) {
      const feature = new DrawingFeature(DrawingShape.Point, this.drawingState, this.config.drawing);
      font = feature.nameFontSize + 'px' + feature.font;
    }
    return {
      text: text,
      font: font,
      pixelOffset: new Cartesian2(0.0, offset),
      fillColor: fill ?? Color.fromCssColorString('#000000'),
      heightReference: CLAMP_TO_GROUND
    };
  }

  private createPoint(color: Color | null = null) {
    if (color == null) {
      color = Color.fromCssColorString(
        new DrawingFeature(DrawingShape.Point, this.drawingState, this.config.drawing).strokeColor
      );
    }
    return { color: color, pixelSize: 5, heightReference: CLAMP_TO_GROUND };
  }

  private getPolygonCenter(positions: Cartesian3[]) {
    return Cartesian3.divideByScalar(
      positions.reduce((p1, p2) => Cartesian3.add(p1, p2, new Cartesian3()), new Cartesian3()),
      positions.length,
      new Cartesian3()
    );
  }

  private getPolyLineLabels(feature: DrawingFeature, pos: Cartesian3[], font: string) {
    return pos.slice(0, -1).map(
      (_, index) =>
        new Entity({
          position: Cartesian3.lerp(pos[index], pos[index + 1], 0.5, new Cartesian3()),
          label: this.createLabel(feature.getLengthText(this.getLength(pos[index], pos[index + 1])), font)
        })
    );
  }

  private getPolygonArea(positions: Cartesian3[]) {
    let area = 0;
    for (let i = 0; i < positions.length - 1; i++) {
      const p1 = this.getPosition(positions[i]);
      const p2 = this.getPosition(positions[i + 1]);
      area += p1[0] * p2[1] - p2[0] * p1[1];
    }
    return Math.abs(area) / 2;
  }

  private getPolyline(positions: Cartesian3[], feature: DrawingFeature) {
    return {
      positions: new CallbackProperty(() => positions, false),
      clampToGround: true,
      width: feature.strokeWidth,
      material: Color.fromCssColorString(feature.strokeColor)
    };
  }

  private getPolygonEntity(positions: Cartesian3[], feature: DrawingFeature) {
    return new Entity({
      polygon: {
        hierarchy: new CallbackProperty(() => new PolygonHierarchy(positions), false),
        material: Color.fromCssColorString(feature.fillColor)
      },
      polyline: {
        positions: new CallbackProperty(() => [...positions, positions[0]], false),
        clampToGround: true,
        width: feature.strokeWidth,
        material: Color.fromCssColorString(feature.strokeColor)
      }
    });
  }
}
