import { afterAll, beforeAll, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import OgcApiFeaturesManager from './ogcapifeaturesmanager';
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import MockHelper from '../tests/mockhelper';
import ServerOgcApi, { LayerOapif } from '../../models/serverogcapi';

vi.mock('./ogcapifeaturesclient');

describe('OgcApiFeaturesManager', () => {
  beforeAll(() => {
    MockHelper.startMocking();
  });
  afterAll(() => {
    MockHelper.stopMocking();
  });
  let manager: OgcApiFeaturesManager;
  let layer: LayerOapif = {
    url: 'https://testUrl.com',
    collectionId: 'collectionId',
    crs: '',
    credentials: '',
    geometryType: 'Point',
    attributeName: '',
    attributeType: '',
    serverType: 'default',
    server: new ServerOgcApi('test', 'https://testUrl.com', 'default')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = OgcApiFeaturesManager.getInstance();
  });

  describe('getItemTemplate', () => {
    it('should return a template object based on queryables', async () => {
      const mockQueryables = {
        properties: {
          name: {},
          age: {},
          id: {},
          geometry: {}
        }
      };
      (manager.getClient(layer.server).getQueryables as Mock).mockResolvedValue(mockQueryables);

      const result = await manager.getItemTemplate(layer);
      expect(result).toEqual({ name: null, age: null });
    });

    it('should handle error and return an empty object', async () => {
      (manager.getClient(layer.server).getQueryables as Mock).mockRejectedValue(new Error('Error'));

      const result = await manager.getItemTemplate(layer);
      expect(result).toEqual({});
    });
  });

  describe('getItems', () => {
    it('should return a list of features', async () => {
      const mockFeatures: Feature<Geometry>[] = [new Feature()];
      (manager.getClient(layer.server).getItems as Mock).mockResolvedValue(mockFeatures);

      const result = await manager.getItems(layer);
      expect(result).toEqual(mockFeatures);
    });

    it('should handle failure and return empty list', async () => {
      (manager.getClient(layer.server).getItems as Mock).mockRejectedValue(new Error('Error'));

      const result = await manager.getItems(layer);
      expect(result).toEqual([]);
    });
  });
});
