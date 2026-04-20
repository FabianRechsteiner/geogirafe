// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import { DrawingShape } from './drawingFeature';
import {
  calculateCenterAndMinRadius,
  createScaledAndRotatedGeometry,
  getGeometryForRendering,
  shouldAllowVertexInsertionForShape
} from './shapeConstraints';

function edgeLength(a: Coordinate, b: Coordinate): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function dotAtCorner(a: Coordinate, b: Coordinate, c: Coordinate): number {
  const ab: Coordinate = [a[0] - b[0], a[1] - b[1]];
  const cb: Coordinate = [c[0] - b[0], c[1] - b[1]];
  return ab[0] * cb[0] + ab[1] * cb[1];
}

describe('shapeConstraints (modify scale/rotate)', () => {
  it('allows vertex insertion when hovered shape is not square/rectangle', () => {
    expect(shouldAllowVertexInsertionForShape(undefined)).toBeTruthy();
    expect(shouldAllowVertexInsertionForShape(DrawingShape.Polygon)).toBeTruthy();
    expect(shouldAllowVertexInsertionForShape(DrawingShape.FreehandPolyline)).toBeTruthy();
  });

  it('blocks vertex insertion when hovered shape is square/rectangle', () => {
    expect(shouldAllowVertexInsertionForShape(DrawingShape.Square)).toBeFalsy();
    expect(shouldAllowVertexInsertionForShape(DrawingShape.Rectangle)).toBeFalsy();
  });

  it('uses modifyGeometry for rendering when available', () => {
    const geometry = new Polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0]
      ]
    ]);
    const modifiedGeometry = new Polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0]
      ]
    ]);
    const feature = new Feature(geometry);
    feature.set('modifyGeometry', { geometry: modifiedGeometry }, true);

    const renderedGeometry = getGeometryForRendering(feature);

    expect(renderedGeometry).toBe(modifiedGeometry);
  });

  it('falls back to feature geometry when modifyGeometry is absent', () => {
    const geometry = new Polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0]
      ]
    ]);
    const feature = new Feature(geometry);

    const renderedGeometry = getGeometryForRendering(feature);

    expect(renderedGeometry).toBe(geometry);
  });

  it('computes center and min radius for a polygon', () => {
    const geometry = new Polygon([
      [
        [0, 0],
        [4, 0],
        [4, 2],
        [0, 2],
        [0, 0]
      ]
    ]);

    const result = calculateCenterAndMinRadius(geometry);

    expect(result.center[0]).toBeCloseTo(2, 10);
    expect(result.center[1]).toBeCloseTo(1, 10);
    expect(result.minRadius).toBeCloseTo(Math.sqrt(5) / 3, 10);
  });

  it('keeps a square as a square after scale/rotate', () => {
    const geometry = new Polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0]
      ]
    ]);
    const center: Coordinate = [1, 1];

    const transformed = createScaledAndRotatedGeometry(geometry, center, 0, [2, 2], [0, 2]) as Polygon;

    const corners = transformed.getCoordinates()[0].slice(0, 4);
    const lengths = [
      edgeLength(corners[0], corners[1]),
      edgeLength(corners[1], corners[2]),
      edgeLength(corners[2], corners[3]),
      edgeLength(corners[3], corners[0])
    ];
    expect(lengths[0]).toBeCloseTo(lengths[1], 10);
    expect(lengths[1]).toBeCloseTo(lengths[2], 10);
    expect(lengths[2]).toBeCloseTo(lengths[3], 10);
    expect(dotAtCorner(corners[3], corners[0], corners[1])).toBeCloseTo(0, 10);
  });

  it('keeps rectangle aspect ratio after scale/rotate', () => {
    const geometry = new Polygon([
      [
        [0, 0],
        [4, 0],
        [4, 2],
        [0, 2],
        [0, 0]
      ]
    ]);
    const center: Coordinate = [2, 1];
    const originalRatio = 4 / 2;

    const transformed = createScaledAndRotatedGeometry(geometry, center, 0, [4, 2], [6, 4]) as Polygon;

    const corners = transformed.getCoordinates()[0].slice(0, 4);
    const sideA = edgeLength(corners[0], corners[1]);
    const sideB = edgeLength(corners[1], corners[2]);
    const ratio = Math.max(sideA, sideB) / Math.min(sideA, sideB);
    expect(ratio).toBeCloseTo(originalRatio, 10);
  });

  it('does not transform when initial point is too close to center', () => {
    const geometry = new Polygon([
      [
        [0, 0],
        [4, 0],
        [4, 2],
        [0, 2],
        [0, 0]
      ]
    ]);
    const center: Coordinate = [2, 1];
    const initial = geometry.getCoordinates();

    const transformed = createScaledAndRotatedGeometry(geometry, center, 10, [2.1, 1.1], [6, 4]) as Polygon;

    expect(transformed.getCoordinates()).toEqual(initial);
  });
});
