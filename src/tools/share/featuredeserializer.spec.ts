import { describe, it, expect } from 'vitest';
import FeatureDeserializer from './featuredeserializer';
import { Circle, LineString, Point, Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { SharedFeature } from './sharedstate';

describe('FeatureDedeserializer.getPoint', () => {
  const deserializer = new FeatureDeserializer();

  it('should deserialize a Point geometry correctly', () => {
    const geom = [10.123, 20.988];
    const serialized: SharedFeature = {
      t: 0,
      g: geom
    };
    // @ts-ignore
    const point = deserializer.getPoint(serialized);

    expect(point).toBeInstanceOf(Point);
    expect(point.getCoordinates()).toEqual(geom);
  });
});

describe('FeatureDedeserializer.getLineString', () => {
  const deserializer = new FeatureDeserializer();

  it('should deserialize a LineString geometry correctly', () => {
    const geom = [
      [10.12, 20.99],
      [30.12, 40.99],
      [50.12, 60.99]
    ];
    const serialized: SharedFeature = {
      t: 1,
      g: geom
    };
    // @ts-ignore
    const linestring = deserializer.getLineString(serialized);

    expect(linestring).toBeInstanceOf(LineString);
    expect(linestring.getCoordinates()).toEqual(geom);
  });
});

describe('FeatureDedeserializer.getPolygon', () => {
  const deserializer = new FeatureDeserializer();

  it('should deserialize a Polygon geometry correctly', () => {
    const geom = [
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
    ];
    const serialized: SharedFeature = {
      t: 2,
      g: geom
    };
    // @ts-ignore
    const polygon = deserializer.getPolygon(serialized);

    expect(polygon).toBeInstanceOf(Polygon);
    expect(polygon.getCoordinates()).toEqual(geom);
  });
});

describe('FeatureDedeserializer.getCircle', () => {
  const deserializer = new FeatureDeserializer();

  it('should deserialize a Circle geometry correctly', () => {
    const center = [10.123, 20.987];
    const radius = 5.123;

    const serialized: SharedFeature = {
      t: 3,
      g: [center, radius]
    };
    // @ts-ignore
    const circle = deserializer.getCircle(serialized);

    expect(circle).toBeInstanceOf(Circle);
    expect(parseFloat(circle.getRadius().toFixed(3))).toEqual(radius);
    expect(circle.getCenter()).toEqual(center);
  });
});

describe('FeatureDedeserializer.setAttributes', () => {
  const deserializer = new FeatureDeserializer();

  it('should set id when deserializing a feature', () => {
    const geom = [10.123, 20.988];
    const serialized: SharedFeature = {
      t: 0,
      g: geom,
      p: {
        n: 'Test Name',
        t: 12,
        f: '#FF0000',
        w: 2,
        o: '#00FF00'
      }
    };
    // @ts-ignore
    const point = deserializer.getPoint(serialized);
    const olFeature = new Feature(point);
    // @ts-ignore
    deserializer.setAttributes(olFeature, serialized);

    expect(olFeature.getId()).toBeTruthy();
  });

  it('should set attributes correctly based on the sharedFeature', () => {
    const geom = [10.123, 20.988];
    const serialized: SharedFeature = {
      t: 0,
      g: geom,
      p: {
        n: 'Test Name',
        t: 12,
        f: '#FF0000',
        w: 2,
        o: '#00FF00'
      }
    };
    // @ts-ignore
    const point = deserializer.getPoint(serialized);
    const olFeature = new Feature(point);
    // @ts-ignore
    deserializer.setAttributes(olFeature, serialized);

    expect(olFeature.get('name')).toBe('Test Name');
    expect(olFeature.get('textSize')).toBe(12);
    expect(olFeature.get('fillColor')).toBe('#FF0000');
    expect(olFeature.get('strokeWidth')).toBe(2);
    expect(olFeature.get('strokeColor')).toBe('#00FF00');
  });

  it('should not set attributes if they are not present in sharedFeature', () => {
    const geom = [10.123, 20.988];
    const serialized: SharedFeature = {
      t: 0,
      g: geom,
      p: {
        n: 'Test Name'
        // textSize, fillColor, strokeWidth, and strokeColor are not present
      }
    };
    // @ts-ignore
    const point = deserializer.getPoint(serialized);
    const olFeature = new Feature(point);
    // @ts-ignore
    deserializer.setAttributes(olFeature, serialized);

    expect(olFeature.get('name')).toBe('Test Name');
    expect(olFeature.get('textSize')).toBeUndefined();
    expect(olFeature.get('fillColor')).toBeUndefined();
    expect(olFeature.get('strokeWidth')).toBeUndefined();
    expect(olFeature.get('strokeColor')).toBeUndefined();
  });
});

describe('FeatureDedeserializer.getFeature', () => {
  const deserializer = new FeatureDeserializer();

  it('should throw error when geometry is of an unknown type', () => {
    const geom = [10.123, 20.988];
    const serialized: SharedFeature = {
      // @ts-ignore
      t: 9999,
      g: geom
    };
    // @ts-ignore
    expect(() => deserializer.getFeature(serialized)).toThrowError();
  });

  it('should deserialize a Point', () => {
    const geom = [10.123, 20.988];
    const serialized: SharedFeature = {
      t: 0,
      g: geom
    };
    // @ts-ignore
    const point = deserializer.getFeature(serialized);
    expect(point.getGeometry()).toBeInstanceOf(Point);
  });

  it('should deserialize a LineString', () => {
    const geom = [
      [10.12, 20.99],
      [30.12, 40.99],
      [50.12, 60.99]
    ];
    const serialized: SharedFeature = {
      t: 1,
      g: geom
    };
    // @ts-ignore
    const linestring = deserializer.getFeature(serialized);
    expect(linestring.getGeometry()).toBeInstanceOf(LineString);
  });

  it('should deserialize a Polygon', () => {
    const geom = [
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
    ];
    const serialized: SharedFeature = {
      t: 2,
      g: geom
    };
    // @ts-ignore
    const polygon = deserializer.getFeature(serialized);
    expect(polygon.getGeometry()).toBeInstanceOf(Polygon);
  });

  it('should deserialize a Circle', () => {
    const center = [10.123, 20.987];
    const radius = 5.123;

    const serialized: SharedFeature = {
      t: 3,
      g: [center, radius]
    };
    // @ts-ignore
    const circle = deserializer.getFeature(serialized);
    expect(circle.getGeometry()).toBeInstanceOf(Circle);
  });
});
