import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getOlayerByName, removeUnwantedOlParams, getDistance, getArea } from './olutils';
import { Map } from 'ol';
import BaseLayer from 'ol/layer/Base';
import Feature from 'ol/Feature';
import { Point, Polygon } from 'ol/geom';
import { Coordinate } from 'ol/coordinate';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import StateManager from '../state/statemanager';
import MockHelper from '../tests/mockhelper';

describe('getOlayerByName function', () => {
  const mockLayerName = 'TestLayer';
  const mockLayer = new BaseLayer({ properties: { name: mockLayerName } });
  const mockMap = new Map();
  mockMap.addLayer(mockLayer);

  it('should return a layer in the map that match the given name', () => {
    const result = getOlayerByName(mockMap, mockLayerName);
    expect(result).toEqual(mockLayer);
  });

  it('should return undefined when no layer matches the given name', () => {
    const result = getOlayerByName(mockMap, 'NonExistentLayer');
    expect(result).toBeUndefined();
  });
});

describe('deleteFeatureOlParams', () => {
  const getFeature = () => {
    return new Feature({
      name: 'Test Feature',
      geometry: new Point([0, 0]),
      boundedBy: 'xyz',
      anObject: {
        test: 'true'
      },
      undefinedObject: {
        'xsi:nil': 'true',
        '_content_': 'foo'
      },
      notUndefinedObject: {
        'xsi:nil': 'false',
        '_content_': 'bar'
      }
    });
  };
  it('Deletes ol properties from given feature', () => {
    const feature = getFeature();
    expect(feature.getProperties()[feature.getGeometryName()]).toBeDefined();
    const modifiedFeature = removeUnwantedOlParams(feature);
    expect(modifiedFeature).toEqual({
      name: 'Test Feature',
      anObject: {
        test: 'true'
      },
      undefinedObject: undefined,
      notUndefinedObject: 'bar'
    });
    expect(modifiedFeature[feature.getGeometryName()]).toBeUndefined();
    expect(modifiedFeature.boundedBy).toBeUndefined();
  });

  it('Deletes ol properties from given feature, but keep geom', () => {
    const feature = getFeature();
    expect(feature.getProperties()[feature.getGeometryName()]).toBeDefined();
    const modifiedFeature = removeUnwantedOlParams(feature, true);
    expect(Object.keys(modifiedFeature).length).toBe(5);
    expect(modifiedFeature.name).toEqual('Test Feature');
    expect(modifiedFeature[feature.getGeometryName()]).toBeDefined();
    expect(modifiedFeature.boundedBy).toBeUndefined();
  });
});

describe('getDistance', () => {
  let stateManager: StateManager;

  beforeAll(() => {
    MockHelper.startMocking();
    stateManager = StateManager.getInstance();

    proj4.defs(
      'EPSG:2056',
      '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs'
    );
    register(proj4);
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  it('calculates the correct distances of coordinates in geographic and projected coordinate systems', () => {
    // Simple coordinates in 1000m distance
    let coordinatesProjected: Coordinate[] = [
      [2600000.0, 1200000.0],
      [2601000.0, 1200000.0]
    ];
    stateManager.state.projection = 'EPSG:2056';
    expect(getDistance(coordinatesProjected)).toBe(1000);

    // Distance measurements in PseudoMercator are heavily distorted, they won't create the same distance as in LV95
    let coordinatesInPseudoMercator = [
      [5934093.1876778575, 828064.7732897857],
      [5934093.082582, 829527.0795103522]
    ];
    const dist = Math.sqrt(
      Math.pow(coordinatesInPseudoMercator[1][0] - coordinatesInPseudoMercator[0][0], 2) +
        Math.pow(coordinatesInPseudoMercator[1][1] - coordinatesInPseudoMercator[0][1], 2)
    );
    stateManager.state.projection = 'EPSG:3857';
    expect(getDistance(coordinatesInPseudoMercator)).toBe(dist);

    // Same coordinates as projected coordinates, but transformed to WGS84 using
    //  https://www.swisstopo.admin.ch/en/coordinates-conversion-navref
    let coordinatesGeographic = [
      [7.438632495, 46.951082877],
      [7.451768616, 46.951082232]
    ];
    stateManager.state.projection = 'EPSG:4326';
    // Allow 2% deviation
    expect(getDistance(coordinatesGeographic)).approximately(1000, 1000 * 0.02);
  });
});

describe('getArea', () => {
  let stateManager: StateManager;

  beforeAll(() => {
    MockHelper.startMocking();
    stateManager = StateManager.getInstance();

    proj4.defs(
      'EPSG:2056',
      '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs'
    );
    register(proj4);
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  it('calculates the correct area of a polygon in geographic and projected coordinate systems', () => {
    // Define square polygon with 1000m edge length
    const coordinatesProjected: Coordinate[][] = [
      [
        [2600000.0, 1200000.0],
        [2601000.0, 1200000.0],
        [2601000.0, 1201000.0],
        [2600000.0, 1201000.0],
        [2600000.0, 1200000.0]
      ]
    ];
    stateManager.state.projection = 'EPSG:2056';
    expect(getArea(new Polygon(coordinatesProjected))).toBe(1000 * 1000);

    // Same polygon as above, but corners are transformed to WGS84 using
    //  https://www.swisstopo.admin.ch/en/coordinates-conversion-navref
    const coordinatesGeographic = [
      [
        [7.438632495, 46.951082877],
        [7.451768616, 46.951082232],
        [7.451770658, 46.960077397],
        [7.438632336, 46.960078041],
        [7.438632495, 46.951082877]
      ]
    ];
    stateManager.state.projection = 'EPSG:4326';
    // Allow 2% deviation
    expect(getArea(new Polygon(coordinatesGeographic))).approximately(1000 * 1000, 1000 * 1000 * 0.02);
  });
});
