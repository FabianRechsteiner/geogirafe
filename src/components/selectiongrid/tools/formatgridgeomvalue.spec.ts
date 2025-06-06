import { test, describe, expect, beforeAll, afterAll } from 'vitest';
import FormatGridGeomValue from './formatgridgeomvalue';
import { Point, LineString, Polygon, MultiPoint, Circle } from 'ol/geom';
import type OlGeomGeometry from 'ol/geom/Geometry';
import MockHelper from '../../../tools/tests/mockhelper';

const getGeometryIconsInfo = (geometry: OlGeomGeometry | null): [string, number[]] | [null, null] => {
  const fg = new FormatGridGeomValue() as any;
  fg.locale = 'en-US';
  return fg.getGeometryIconsInfo(geometry);
};

describe('FormatGridGeomValue', () => {
  beforeAll(() => {
    MockHelper.startMocking();
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  test('Testing Point type null geometry', () => {
    const [icon, coords] = getGeometryIconsInfo(null);
    expect(icon).toBeNull();
    expect(coords).toBeNull();
  });

  test('Testing Point type geometry', () => {
    const pointGeometry = new Point([100, 100]);
    const [icon, coords] = getGeometryIconsInfo(pointGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([100, 100]);
  });

  test('Testing MultiPoint type geometry', () => {
    const multipointGeometry = new MultiPoint([
      [0, 0],
      [100, 100]
    ]);
    const [icon, coords] = getGeometryIconsInfo(multipointGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([50, 50]);
  });

  test('Testing LineString type geometry', () => {
    const lineGeometry = new LineString([
      [0, 0],
      [100, 100]
    ]);
    const [icon, coords] = getGeometryIconsInfo(lineGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([50, 50]);
  });

  test('Testing Polygon type geometry', () => {
    const polygonGeometry = new Polygon([
      [
        [0, 0],
        [100, 0],
        [100, 100],
        [100, 0],
        [0, 0]
      ]
    ]);
    const [icon, coords] = getGeometryIconsInfo(polygonGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([50, 50]);
  });

  test('Testing Polygon type geometry', () => {
    const circleGeometry = new Circle([25, 25], 100);
    const [icon, coords] = getGeometryIconsInfo(circleGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([25, 25]);
  });
});
