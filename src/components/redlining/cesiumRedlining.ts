import * as Cesium from 'cesium';
import { Cartesian3, Entity } from 'cesium';
import RedliningFeature from './redliningFeature';
import RedliningShape from './redliningshape';

import MapComponent from '../map/component';
import StateManager from '../../tools/state/statemanager';
import ConfigManager from '../../tools/configuration/configmanager';
import State from '../../tools/state/state';
import ComponentManager from '../../tools/state/componentManager';

const getPositionAsText = (p: Cartesian3) => p.x.toFixed(3) + ' ; ' + p.y.toFixed(3) + ' ; ' + p.z.toFixed(3);

export default class CesiumRedlining {
  map: MapComponent;
  state: State;
  activeShapePoints: Cartesian3[] = [];
  activeShapes: Entity[] | undefined = undefined;
  floatingPoint: Entity | undefined = undefined;

  scene: Cesium.Scene | undefined = undefined;
  handler: Cesium.ScreenSpaceEventHandler | undefined = undefined;
  entities: Cesium.EntityCollection | undefined = undefined;
  configManager: ConfigManager | undefined = undefined;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.map = ComponentManager.getInstance().getComponents(MapComponent)[0];
    this.state = StateManager.getInstance().state;

    StateManager.getInstance().subscribe('globe.loaded', () => {
      if (StateManager.getInstance().state.globe.loaded) {
        this.scene = this.map.map3d.getCesiumScene();
        this.handler = new Cesium.ScreenSpaceEventHandler(this.scene!.canvas);
        this.entities = this.map.map3d.getDataSourceDisplay().defaultDataSource.entities;
        this.registerEvents();
      }
    });
  }

  registerEvents() {
    this.map.stateManager.subscribe(
      'extendedState.redlining.activeTool',
      (_oldTool: string | null, newTool: RedliningShape | null) =>
        newTool === null ? this.deactivateRedlining() : this.activateRedlining(newTool)
    );
  }

  activateRedlining(tool: RedliningShape) {
    this.state.selection.enabled = false;
    this.handler!.setInputAction(this.addPoint(tool), Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler!.setInputAction(this.updateShape(tool), Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    this.handler!.setInputAction(this.terminateShape(tool), Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    this.floatingPoint = this.entities!.add({
      point: {
        color: Cesium.Color.fromCssColorString(this.configManager!.Config.redlining.defaultStrokeColor),
        pixelSize: 5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });
  }

  deactivateRedlining() {
    this.state.selection.enabled = true;
    this.handler!.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler!.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    this.handler!.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    if (this.floatingPoint) {
      this.entities!.remove(this.floatingPoint);
      this.floatingPoint = undefined;
    }
  }

  // Actions

  pickOnGlobe(position: Cesium.Cartesian2) {
    const ray = this.scene!.camera.getPickRay(position);
    return ray == undefined ? undefined : this.scene!.globe.pick(ray, this.scene!);
  }

  terminateShape(tool: RedliningShape) {
    return () => {
      const newCesiumEntityPoints = this.activeShapePoints.slice(0, this.activeShapePoints.length - 1);
      let newCesiumEntities = this.getShapes(tool, newCesiumEntityPoints, new RedliningFeature(tool));
      newCesiumEntities.forEach((e) => this.entities!.add(e));
      if (this.activeShapes) {
        this.activeShapes.forEach((e) => this.entities!.remove(e));
      }

      const newFeature = new RedliningFeature(tool);

      const updateStyle = () => {
        newCesiumEntities.forEach((e) => this.entities!.remove(e));
        newCesiumEntities = this.getShapes(tool, newCesiumEntityPoints, newFeature);
        newCesiumEntities.forEach((s) => this.entities!.add(s));
      };

      newFeature.onNameChange(updateStyle);
      newFeature.onFillColorChange(updateStyle);
      newFeature.onStrokeColorChange(updateStyle);
      newFeature.onStrokeWidthChange(updateStyle);
      newFeature.onFontSizeChange(updateStyle);
      newFeature.onRemove(() => newCesiumEntities.forEach((e) => this.entities!.remove(e)));
      newFeature.update();
      newFeature.addToState();

      this.activeShapes = undefined;
      this.activeShapePoints = [];
    };
  }

  updateShape(tool: RedliningShape) {
    return (event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const newPosition = this.pickOnGlobe(event.endPosition);

      if (Cesium.defined(newPosition)) {
        if (Cesium.defined(this.activeShapes)) {
          if (tool == RedliningShape.FreehandPolyline || tool == RedliningShape.FreehandPolygon) {
            this.activeShapePoints.push(newPosition);
          } else {
            this.activeShapePoints[this.activeShapePoints.length - 1] = newPosition;
          }
        }
        this.floatingPoint!.position = new Cesium.ConstantPositionProperty(newPosition);
      }
    };
  }

  addPoint(tool: RedliningShape) {
    return (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const earthPosition = this.pickOnGlobe(event.position);

      if (Cesium.defined(earthPosition)) {
        // If the cursor is pointing in the map
        this.activeShapePoints.push(earthPosition);

        if (this.activeShapePoints.length === 1) {
          this.activeShapePoints.push(earthPosition); // Add a point for the one under the cursor
          this.activeShapes = this.getShapes(tool, this.activeShapePoints, new RedliningFeature(tool));
          this.activeShapes.forEach((e) => this.entities!.add(e));
        }

        // Tools that automatically terminate the shape after a fixed number of points
        if (
          (tool === RedliningShape.Point && this.activeShapePoints.length === 2) ||
          (tool === RedliningShape.Disk && this.activeShapePoints.length === 3) ||
          (tool === RedliningShape.Square && this.activeShapePoints.length === 3) ||
          (tool === RedliningShape.Rectangle && this.activeShapePoints.length === 3)
        ) {
          return this.terminateShape(tool)();
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
    return [pos1, Cesium.Cartographic.toCartesian(pos3Carto), pos2, Cesium.Cartographic.toCartesian(pos4Carto), pos1];
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

  getPolyLineLabels(pos: Cartesian3[], font: string) {
    return pos.slice(0, -2).map(
      (_, index) =>
        new Cesium.Entity({
          position: Cartesian3.lerp(pos[index], pos[index + 1], 0.5, new Cartesian3()),
          label: {
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            text: RedliningFeature.formatDistance(Cartesian3.distance(pos[index], pos[index + 1])),
            font: font,
            pixelOffset: new Cesium.Cartesian2(0.0, -15),
            fillColor: Cesium.Color.fromCssColorString('#000000')
          }
        })
    );
  }

  getPolygonCenter(positions: Cartesian3[]) {
    return Cartesian3.divideByScalar(
      positions.reduce((p1, p2) => Cartesian3.add(p1, p2, new Cartesian3()), new Cartesian3()),
      positions.length,
      new Cartesian3()
    );
  }

  getPolygonArea(positions: Cartesian3[]) {
    const center = this.getPolygonCenter(positions);
    if (positions.length < 3) {
      return 0;
    }

    return positions
      .slice(0, -2)
      .map((_, i) => {
        const a = Cartesian3.distance(positions[i], positions[i + 1]);
        const b = Cartesian3.distance(positions[i], center);
        const c = Cartesian3.distance(center, positions[i + 1]);
        const s = (a + b + c) / 2;
        return Math.sqrt(s * (s - a) * (s - b) * (s - c));
      })
      .reduce((a, b) => a + b, 0);
  }

  generateEntityOutline(positionsGenerator: Cesium.CallbackProperty.Callback, feature: RedliningFeature) {
    return {
      positions: new Cesium.CallbackProperty(positionsGenerator, false),
      clampToGround: true,
      width: feature.strokeWidth,
      material: Cesium.Color.fromCssColorString(feature.strokeColor)
    };
  }

  getShapes(tool: RedliningShape, positions: Cartesian3[], feature: RedliningFeature) {
    const fillColor = Cesium.Color.fromCssColorString(feature.fillColor);
    const strokeColor = Cesium.Color.fromCssColorString(feature.strokeColor);
    const font = feature.fontSize + 'px' + feature.font;

    switch (tool) {
      case RedliningShape.Polyline:
        return [
          new Cesium.Entity({ polyline: this.generateEntityOutline(() => positions, feature) }),
          ...this.getPolyLineLabels(positions, font)
        ];
      case RedliningShape.FreehandPolyline:
        return [
          new Cesium.Entity({ polyline: this.generateEntityOutline(() => positions, feature) }),
          new Cesium.Entity({
            position: positions[Math.ceil(positions.length / 2)],
            label: {
              text: RedliningFeature.formatDistance(
                positions
                  .slice(0, -1)
                  .map((_, i) => Cartesian3.distance(positions[i], positions[i + 1]))
                  .reduce((a, b) => a + b, 0)
              ),
              font: font,
              pixelOffset: new Cesium.Cartesian2(0.0, -15),
              fillColor: Cesium.Color.fromCssColorString('#000000')
            }
          })
        ];
      case RedliningShape.Polygon:
        return [
          new Cesium.Entity({
            polygon: {
              hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(positions), false),
              material: fillColor
            },
            polyline: this.generateEntityOutline(() => [...positions, positions[0]], feature)
          }),
          ...this.getPolyLineLabels(positions, font),
          new Cesium.Entity({
            position: this.getPolygonCenter(positions),
            label: {
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              text: RedliningFeature.formatArea(this.getPolygonArea(positions)),
              font: font,
              pixelOffset: new Cesium.Cartesian2(0.0, -15),
              fillColor: Cesium.Color.fromCssColorString('#000000')
            }
          })
        ];
      case RedliningShape.FreehandPolygon:
        return [
          new Cesium.Entity({
            polygon: {
              hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy([...positions]), false),
              material: fillColor
            },
            polyline: this.generateEntityOutline(() => [...positions, positions[0]], feature)
          }),
          new Cesium.Entity({
            position: this.getPolygonCenter([...positions]),
            label: {
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              text: RedliningFeature.formatArea(this.getPolygonArea([...positions])),
              font: font,
              pixelOffset: new Cesium.Cartesian2(0.0, -15),
              fillColor: Cesium.Color.fromCssColorString('#000000')
            }
          })
        ];
      case RedliningShape.Point:
        return [
          new Cesium.Entity({
            position: positions[0],
            point: {
              color: strokeColor,
              pixelSize: 5,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            },
            label: {
              text: getPositionAsText(positions[0]),
              font: font,
              pixelOffset: new Cesium.Cartesian2(0.0, -15),
              fillColor: Cesium.Color.fromCssColorString('#000000')
            }
          })
        ];
      case RedliningShape.Disk:
        return [
          new Cesium.Entity({
            position: positions[0],
            ellipse: {
              semiMinorAxis: new Cesium.CallbackProperty(
                () => Cartesian3.magnitude(this.leveledCenterToMouse(positions)),
                false
              ),
              semiMajorAxis: new Cesium.CallbackProperty(
                () => Cartesian3.magnitude(this.leveledCenterToMouse(positions)),
                false
              ),
              material: fillColor
            },
            polyline: this.generateEntityOutline(
              () => this.makeRegularPolygon(positions[0], positions[positions.length - 1], 300),
              feature
            ),
            point: {
              color: strokeColor,
              pixelSize: 5,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          }),
          new Cesium.Entity({
            position: positions[0],
            label: {
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              text: RedliningFeature.formatArea(Math.PI * Math.pow(Cartesian3.distance(positions[0], positions[1]), 2)),
              font: font,
              pixelOffset: new Cesium.Cartesian2(0.0, -15),
              fillColor: Cesium.Color.fromCssColorString('#000000')
            }
          })
        ];
      case RedliningShape.Square:
        return [
          new Cesium.Entity({
            polygon: {
              hierarchy: new Cesium.CallbackProperty(
                () =>
                  new Cesium.PolygonHierarchy(
                    this.makeRegularPolygon(positions[0], positions[positions.length - 1], 4)
                  ),
                false
              ),
              material: fillColor
            },
            polyline: this.generateEntityOutline(
              () => this.makeRegularPolygon(positions[0], positions[positions.length - 1], 4),
              feature
            )
          }),
          new Cesium.Entity({
            position: positions[0],
            label: {
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              text: RedliningFeature.formatArea(
                Math.pow(Math.SQRT2 * Cartesian3.distance(positions[0], positions[1]), 2)
              ),
              font: font,
              pixelOffset: new Cesium.Cartesian2(0.0, -15),
              fillColor: Cesium.Color.fromCssColorString('#000000')
            }
          })
        ];
      case RedliningShape.Rectangle:
        return [
          new Cesium.Entity({
            polygon: {
              hierarchy: new Cesium.CallbackProperty(
                () => new Cesium.PolygonHierarchy(this.makeRectangle(positions[0], positions[1])),
                false
              ),
              material: fillColor
            },
            polyline: this.generateEntityOutline(() => this.makeRectangle(positions[0], positions[1]), feature)
          }),
          new Cesium.Entity({
            position: this.getPolygonCenter([...positions]),
            label: {
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              text: RedliningFeature.formatArea(this.getPolygonArea(this.makeRectangle(positions[0], positions[1]))),
              font: font,
              pixelOffset: new Cesium.Cartesian2(0.0, -15),
              fillColor: Cesium.Color.fromCssColorString('#000000')
            }
          })
        ];
      default:
        throw Error(`Unrecognized tool : ${tool}`);
    }
  }
}
