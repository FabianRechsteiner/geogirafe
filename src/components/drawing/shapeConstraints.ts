// SPDX-License-Identifier: Apache-2.0
import { getCenter, getHeight, getWidth } from 'ol/extent';
import { Coordinate } from 'ol/coordinate';
import Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import { DrawingShape } from './drawingFeature';

const EPSILON = 1e-12;

function sqDistance(a: Coordinate, b: Coordinate): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

export function calculateCenterAndMinRadius(geometry: Geometry): { center: Coordinate; minRadius: number } {
  let center: Coordinate;
  let coordinates: Coordinate[] | undefined;

  if (geometry instanceof Polygon) {
    const ring = geometry.getCoordinates()[0];
    const polygonCoords = ring.slice(0, -1);
    const x = polygonCoords.reduce((sum, c) => sum + c[0], 0);
    const y = polygonCoords.reduce((sum, c) => sum + c[1], 0);
    center = [x / polygonCoords.length, y / polygonCoords.length];
    coordinates = polygonCoords;
  } else if (geometry instanceof LineString) {
    center = geometry.getCoordinateAt(0.5);
    coordinates = geometry.getCoordinates();
  } else {
    center = getCenter(geometry.getExtent());
  }

  if (coordinates && coordinates.length > 0) {
    const maxSqDistance = Math.max(...coordinates.map((coordinate) => sqDistance(coordinate, center)));
    return {
      center,
      minRadius: Math.sqrt(maxSqDistance) / 3
    };
  }

  return {
    center,
    minRadius: Math.max(getWidth(geometry.getExtent()), getHeight(geometry.getExtent())) / 3
  };
}

export function createScaledAndRotatedGeometry(
  geometry0: Geometry,
  center: Coordinate,
  minRadius: number,
  initialPoint: Coordinate,
  currentPoint: Coordinate
): Geometry {
  const initialRadius = Math.sqrt(sqDistance(initialPoint, center));
  if (initialRadius <= minRadius) {
    return geometry0.clone();
  }

  const currentRadius = Math.sqrt(sqDistance(currentPoint, center));
  if (currentRadius <= EPSILON) {
    return geometry0.clone();
  }

  const initialAngle = Math.atan2(initialPoint[1] - center[1], initialPoint[0] - center[0]);
  const currentAngle = Math.atan2(currentPoint[1] - center[1], currentPoint[0] - center[0]);

  const geometry = geometry0.clone();
  geometry.scale(currentRadius / initialRadius, undefined, center);
  geometry.rotate(currentAngle - initialAngle, center);
  return geometry;
}

export function getGeometryForRendering(feature: Feature<Geometry>): Geometry | undefined {
  const modifyGeometry = feature.get('modifyGeometry') as { geometry?: Geometry } | undefined;
  return modifyGeometry?.geometry ?? feature.getGeometry() ?? undefined;
}

export function shouldAllowVertexInsertionForShape(shapeType: DrawingShape | undefined): boolean {
  return shapeType !== DrawingShape.Square && shapeType !== DrawingShape.Rectangle;
}
