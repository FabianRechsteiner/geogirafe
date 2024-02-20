import { describe, it, expect } from 'vitest';
import FeatureSerializer from './featureserializer';
import { Coordinate } from 'ol/coordinate';
import { Circle, LineString, Point, Polygon } from 'ol/geom';
import Feature from 'ol/Feature';

describe('FeatureSerializer.simplify', () => {
  const serializer = new FeatureSerializer(3);

  it('should round number down', () => {
    // @ts-ignore
    const simplified = serializer.simplify(10.1233333);
    expect(simplified).toBeCloseTo(10.123);
  });

  it('should round number up', () => {
    // @ts-ignore
    const simplified = serializer.simplify(10.1239999);
    expect(simplified).toBeCloseTo(10.124);
  });

  it('should simplify coordinate', () => {
    // @ts-ignore
    const simplified: Coordinate = serializer.simplify([10.123456789, 20.987654321]);
    expect(simplified).toEqual([10.123, 20.988]);
  });

  it('should throw error when passed unsupported type', () => {
    // @ts-ignore
    expect(() => serializer.simplify('not a number or array')).toThrowError();
  });
});

describe('FeatureSerializer.getPoint', () => {
  const serializer = new FeatureSerializer(3);

  it('should serialize a Point geometry correctly', () => {
    const point = new Point([10.123456789, 20.987654321]);
    // @ts-ignore
    const serialized = serializer.getPoint(point);

    expect(serialized.t).toBe(0);
    expect(serialized.g).toEqual([10.123, 20.988]);
  });
});

describe('FeatureSerializer.getLineString', () => {
  const serializer = new FeatureSerializer(2);

  it('should serialize a LineString geometry correctly', () => {
    const lineString = new LineString([
      [10.123456789, 20.987654321],
      [30.123456789, 40.987654321],
      [50.123456789, 60.987654321]
    ]);
    // @ts-ignore
    const serialized = serializer.getLineString(lineString);

    expect(serialized.t).toBe(1);
    expect(serialized.g).toEqual([
      [10.12, 20.99],
      [30.12, 40.99],
      [50.12, 60.99]
    ]);
  });
});

describe('FeatureSerializer.getPolygon', () => {
  const serializer = new FeatureSerializer(2);

  it('should serialize a Polygon geometry correctly', () => {
    const polygon = new Polygon([
      [
        [10.123456789, 20.987654321],
        [30.123456789, 40.987654321],
        [50.123456789, 60.987654321],
        [10.123456789, 20.987654321]
      ],
      [
        [70.123456789, 80.987654321],
        [90.123456789, 100.987654321],
        [110.123456789, 120.987654321],
        [70.123456789, 80.987654321]
      ]
    ]);
    // @ts-ignore
    const serialized = serializer.getPolygon(polygon);

    expect(serialized.t).toBe(2);
    expect(serialized.g).toEqual([
      [
        [10.12, 20.99],
        [30.12, 40.99],
        [50.12, 60.99],
        [10.12, 20.99]
      ],
      [
        [70.12, 80.99],
        [90.12, 100.99],
        [110.12, 120.99],
        [70.12, 80.99]
      ]
    ]);
  });
});

describe('FeatureSerializer.getCircle', () => {
  const serializer = new FeatureSerializer(2);

  it('should serialize a Circle geometry correctly', () => {
    const circle = new Circle([10.123456789, 20.987654321], 5.123456789);
    // @ts-ignore
    const serialized = serializer.getCircle(circle);

    expect(serialized.t).toBe(3);
    expect(serialized.g).toEqual([
      [10.12, 20.99], // Center coordinates
      5.12 // Radius
    ]);
  });
});

describe('FeatureSerializer.getAttributes', () => {
  const serializer = new FeatureSerializer(3);

  it('should return empty properties when no relevant properties are present', () => {
    const feature = new Feature(new Point([10.123456789, 20.987654321]));
    // @ts-ignore
    const attributes = serializer.getAttributes(feature);
    expect(attributes).toEqual({});
  });

  it('should return properties with name, textSize, fillColor, strokeWidth, and strokeColor', () => {
    const feature = new Feature({
      geometry: new Point([10.123456789, 20.987654321]),
      name: 'Test Name',
      textSize: 12,
      fillColor: '#FF0000',
      strokeWidth: 2,
      strokeColor: '#00FF00'
    });
    // @ts-ignore
    const attributes = serializer.getAttributes(feature);

    expect(attributes).toEqual({
      n: 'Test Name',
      t: 12,
      f: '#FF0000',
      w: 2,
      o: '#00FF00'
    });
  });

  it('should only return relevant properties that are present', () => {
    const feature = new Feature({
      geometry: new Point([10.123456789, 20.987654321]),
      name: 'Test Name',
      fillColor: '#FF0000'
    });
    // @ts-ignore
    const attributes = serializer.getAttributes(feature);

    expect(attributes).toEqual({
      n: 'Test Name',
      f: '#FF0000'
    });
  });
});

describe('FeatureSerializer.getFeature', () => {
  const serializer = new FeatureSerializer(2);

  it('should throw error when geometry is null', () => {
    const feature = new Feature();
    // @ts-ignore
    expect(() => serializer.getFeature(feature)).toThrowError();
  });

  it('should serialize a Point', () => {
    const point = new Point([10.123456789, 20.987654321]);
    const feature = new Feature(point);
    // @ts-ignore
    const serialized = serializer.getFeature(feature);

    expect(serialized.t).toBe(0);
  });

  it('should serialize a LineString', () => {
    const linestring = new LineString([
      [10.123456789, 20.987654321],
      [30.123456789, 40.987654321],
      [50.123456789, 60.987654321]
    ]);
    const feature = new Feature(linestring);
    // @ts-ignore
    const serialized = serializer.getFeature(feature);

    expect(serialized.t).toBe(1);
  });

  it('should serialize a Polygon', () => {
    const polygon = new Polygon([
      [
        [10.123456789, 20.987654321],
        [30.123456789, 40.987654321],
        [50.123456789, 60.987654321],
        [10.123456789, 20.987654321]
      ]
    ]);
    const feature = new Feature(polygon);
    // @ts-ignore
    const serialized = serializer.getFeature(feature);

    expect(serialized.t).toBe(2);
  });

  it('should serialize a Circle', () => {
    const circle = new Circle([10.123456789, 20.987654321], 5.123456789);
    const feature = new Feature(circle);
    // @ts-ignore
    const serialized = serializer.getFeature(feature);

    expect(serialized.t).toBe(3);
  });
});
