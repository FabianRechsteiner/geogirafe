import { describe, expect, it } from 'vitest';
import { getOlayerByName, removeUnwantedOlParams } from './olutils';
import { Map } from 'ol';
import BaseLayer from 'ol/layer/Base';
import Feature from 'ol/Feature';
import { Point } from 'ol/geom';

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
