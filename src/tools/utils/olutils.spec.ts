import { describe, expect, it } from 'vitest';
import { getOlayerByName, deleteFeatureOlParams } from './olutils';
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
  it('Deletes ol properties from given features', () => {
    const feature = new Feature({
      name: 'Test Feature',
      geometry: new Point([0, 0]),
      boundedBy: 'xyz'
    });
    expect(feature.getProperties()[feature.getGeometryName()]).toBeDefined();
    const modifiedFeature = deleteFeatureOlParams(feature);
    expect(modifiedFeature).toEqual({ name: 'Test Feature' });
    expect(modifiedFeature.boundedBy).toBeUndefined();
    expect(modifiedFeature[feature.getGeometryName()]).toBeUndefined();
  });
});
