import { afterAll, beforeAll, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import OgcApiFeaturesManager from './ogcapifeaturesmanager';
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import MockHelper from '../tests/mockhelper';
import { OapifLayer } from '../../models/serverogcapifeatures';
import ServerOgc from '../../models/serverogc';
import IGirafeContext from '../context/icontext';

vi.mock('./ogcapifeaturesclient');

describe('OgcApiFeaturesManager', () => {
  let context: IGirafeContext;
  beforeAll(() => {
    context = MockHelper.startMocking();
  });
  afterAll(() => {
    MockHelper.stopMocking(context);
  });
  let manager: OgcApiFeaturesManager;
  let layer: OapifLayer = {
    url: 'https://testUrl.com',
    collectionId: 'collectionId',
    collectionTitle: 'collectionTitle',
    displayName: 'OapifLayer',
    crs: '',
    credentials: '',
    geometryType: 'Point',
    attributeName: '',
    attributeType: '',
    serverType: 'default',
    server: new ServerOgc('test', {
      url: 'https://testUrl.com',
      wfsSupport: false,
      urlWfs: '',
      oapifSupport: true,
      urlOapif: "'https://testUrl.com",
      type: 'qgisserver',
      imageType: ''
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = context.ogcApiFeaturesManager;
  });

  describe('getSchema', () => {
    const mockSchemaResponse = {
      properties: {
        geometry: {
          'format': 'geometry-any',
          'x-ogc-role': 'primary-geometry'
        },
        id: {
          'type': 'integer',
          'x-ogc-role': 'id', // Primary key
          'x-ogc-propertySeq': 0 // Attribute order
        },
        titleAttribute: {
          'title': 'Attr Title',
          'type': 'string',
          'maxLength': 100,
          'x-ogc-propertySeq': 1
        },
        doubleAttribute: {
          'type': 'number',
          'format': 'double',
          'x-ogc-propertySeq': 3
        }
      }
    };

    it('should return a template object based on the schema', async () => {
      (manager.getClient(layer.server).getSchema as Mock).mockResolvedValue(mockSchemaResponse);

      const result = await manager.getSchema(layer);
      expect(result.template).toEqual({ titleAttribute: null, doubleAttribute: null });
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
