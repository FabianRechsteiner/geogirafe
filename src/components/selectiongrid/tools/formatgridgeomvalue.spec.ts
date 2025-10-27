import { test, describe, expect, beforeAll, afterAll } from 'vitest';
import FormatGridGeomValue from './formatgridgeomvalue';
import { Point, LineString, Polygon, MultiPoint, Circle } from 'ol/geom';
import MockHelper from '../../../tools/tests/mockhelper';
import IGirafeContext from '../../../tools/context/icontext';

describe('FormatGridGeomValue', () => {
  let context: IGirafeContext;
  let formatGridGeomValue: FormatGridGeomValue;

  beforeAll(() => {
    context = MockHelper.startMocking();
    formatGridGeomValue = new FormatGridGeomValue('en-US', 'EPSG:4326');
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  test('Testing Point type null geometry', () => {
    // @ts-ignore
    const [icon, coords] = formatGridGeomValue.getGeometryIconsInfo(null);
    expect(icon).toBeNull();
    expect(coords).toBeNull();
  });

  test('Testing Point type geometry', () => {
    const pointGeometry = new Point([100, 100]);
    // @ts-ignore
    const [icon, coords] = formatGridGeomValue.getGeometryIconsInfo(pointGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([100, 100]);
  });

  test('Testing MultiPoint type geometry', () => {
    const multipointGeometry = new MultiPoint([
      [0, 0],
      [100, 100]
    ]);
    // @ts-ignore
    const [icon, coords] = formatGridGeomValue.getGeometryIconsInfo(multipointGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([50, 50]);
  });

  test('Testing LineString type geometry', () => {
    const lineGeometry = new LineString([
      [0, 0],
      [100, 100]
    ]);
    // @ts-ignore
    const [icon, coords] = formatGridGeomValue.getGeometryIconsInfo(lineGeometry);
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
    // @ts-ignore
    const [icon, coords] = formatGridGeomValue.getGeometryIconsInfo(polygonGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([50, 50]);
  });

  test('Testing Polygon type geometry', () => {
    const circleGeometry = new Circle([25, 25], 100);
    // @ts-ignore
    const [icon, coords] = formatGridGeomValue.getGeometryIconsInfo(circleGeometry);
    expect(icon).toBeDefined();
    expect(coords).toEqual([25, 25]);
  });
});
