import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import OgcApiFeaturesClient from './ogcapifeaturesclient';
import ServerOgc from '../../models/serverogc';
import MockHelper from '../tests/mockhelper';
import { OapifCollection } from '../../models/serverogcapifeatures';
import { Point } from 'ol/geom';
import Feature from 'ol/Feature';

let client: OgcApiFeaturesClient;
const mockUrl = 'https://example.com';
const server: ServerOgc = new ServerOgc('test', {
  url: mockUrl,
  wfsSupport: false,
  urlWfs: '',
  oapifSupport: true,
  urlOapif: mockUrl,
  type: 'default',
  imageType: ''
});
const collectionId = 'test-collection';
const mockCollection = {
  id: collectionId,
  title: 'title',
  itemType: 'feature',
  crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84', 'http://www.opengis.net/def/crs/EPSG/0/3857'],
  storageCrs: 'http://www.opengis.net/def/crs/EPSG/0/2056',
  links: [
    {
      rel: 'http://www.opengis.net/def/rel/ogc/1.0/schema',
      type: 'application/schema+json',
      href: `${mockUrl}/collections/${collectionId}/schema`
    },
    {
      rel: 'http://www.opengis.net/def/rel/ogc/1.0/queryables',
      type: 'application/schema+json',
      href: `${mockUrl}/collections/${collectionId}/queryables`
    },
    {
      rel: 'someOtherRelation',
      type: 'text/plain',
      href: `${mockUrl}/collections/${collectionId}/someOtherRelation`
    }
  ]
};

beforeAll(() => {
  MockHelper.startMocking();
});
afterAll(() => {
  MockHelper.stopMocking();
});

describe('OgcApiFeaturesClient.getCollectionRelation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    client = new OgcApiFeaturesClient(server);

    // Mock getCollection to provide fake collection data for tests
    vi.spyOn(client, 'getCollection').mockResolvedValue(mockCollection);
  });

  it('should return the parsed JSON response for a valid relation and type', async () => {
    const mockResponse = { test: 'data' };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await client.getCollectionRelation(
      collectionId,
      'http://www.opengis.net/def/rel/ogc/1.0/schema',
      'application/schema+json'
    );
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(`${mockUrl}/collections/${collectionId}/schema`, expect.any(Object));
  });

  it('should throw an error if the relation link is not found', async () => {
    await expect(
      client.getCollectionRelation(
        collectionId,
        'http://www.opengis.net/def/rel/ogc/1.0/invalid',
        'application/schema+json'
      )
    ).rejects.toThrow(
      `OGC API collection '${collectionId}' does not support 'http://www.opengis.net/def/rel/ogc/1.0/invalid'`
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should throw an error if the fetch response is not ok', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(
      client.getCollectionRelation(
        collectionId,
        'http://www.opengis.net/def/rel/ogc/1.0/schema',
        'application/schema+json'
      )
    ).rejects.toThrow(`Failed to get http://www.opengis.net/def/rel/ogc/1.0/schema: 404 - Not Found`);
  });

  it('should return the raw response for a non-JSON encoding type', async () => {
    const mockResponse = new Response('raw data');
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await client.getCollectionRelation(collectionId, 'someOtherRelation', 'text/plain');
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      `${mockUrl}/collections/${collectionId}/someOtherRelation`,
      expect.any(Object)
    );
  });
});

describe('OgcApiFeaturesClient.getCrsIdentifier', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    client = new OgcApiFeaturesClient(server);
    vi.spyOn(client, 'getCollection').mockResolvedValue(mockCollection);
  });

  it('should return CRS84 for EPSG:4326 when collection CRSs include CRS84', async () => {
    const crsIdentifier = await client['getCrsIdentifier']('test-collection', 'EPSG:4326');
    expect(crsIdentifier).toBe('http://www.opengis.net/def/crs/OGC/1.3/CRS84');
  });

  it('should return the correct CRS URL matching the provided EPSG code', async () => {
    const crsIdentifier = await client['getCrsIdentifier']('test-collection', 'EPSG:3857');
    expect(crsIdentifier).toBe('http://www.opengis.net/def/crs/EPSG/0/3857');
  });

  it('should return undefined when no matching CRS is found', async () => {
    const crsIdentifier = await client['getCrsIdentifier']('test-collection', 'EPSG:1111');
    expect(crsIdentifier).toBeUndefined();
  });

  it('should handle cases where collection.crs is undefined', async () => {
    const mockCollectionNoCrs = { ...mockCollection, crs: undefined };
    vi.spyOn(client, 'getCollection').mockResolvedValue(mockCollectionNoCrs);
    const crsIdentifier = await client['getCrsIdentifier']('test-collection', 'EPSG:4326');
    expect(crsIdentifier).toBeUndefined();
  });
});

describe('OgcApiFeaturesClient.getStorageCrs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    client = new OgcApiFeaturesClient(server);
    vi.spyOn(client, 'getCollection').mockResolvedValue(mockCollection);
  });

  it('should return the storageCrs if it is available in the collection', async () => {
    const storageCrs = await client['getStorageCrs']('test-collection');
    expect(storageCrs).toBe('http://www.opengis.net/def/crs/EPSG/0/2056');
  });

  it('should call getCrsIdentifier if storageCrs is not defined', async () => {
    const collection: OapifCollection = {
      id: 'test-collection',
      title: 'Test Collection',
      links: [],
      itemType: 'feature',
      crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84']
    };
    vi.spyOn(client, 'getCollection').mockResolvedValue(collection);
    vi.spyOn(client as any, 'getCrsIdentifier').mockResolvedValue('http://www.opengis.net/def/crs/OGC/1.3/CRS84');

    const storageCrs = await client['getStorageCrs']('test-collection');
    expect(storageCrs).toBe('http://www.opengis.net/def/crs/OGC/1.3/CRS84');
    expect(client['getCrsIdentifier']).toHaveBeenCalledWith('test-collection', 'EPSG:4326');
  });

  it('should throw an error if neither storageCrs nor a default CRS is available', async () => {
    const collection: OapifCollection = {
      id: 'test-collection',
      title: 'Test Collection',
      links: [],
      itemType: 'feature'
    };
    vi.spyOn(client, 'getCollection').mockResolvedValue(collection);
    vi.spyOn(client as any, 'getCrsIdentifier').mockResolvedValue(undefined);

    await expect(client['getStorageCrs']('test-collection')).rejects.toThrowError(
      'Not able to save feature: The OAPIF server does not specify a storage coordinate reference system (crs) ' +
        'and also does not support the default WGS84.'
    );
  });
});

describe('OgcApiFeaturesClient.reprojectItemToStorageCrs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    client = new OgcApiFeaturesClient(server);
    vi.spyOn(client, 'getCollection').mockResolvedValue(mockCollection);
  });

  it('should reproject coordinates to storage CRS', async () => {
    const olFeature = new Feature();
    olFeature.setGeometry(new Point([7.3, 47.0]));

    const reprojectedFeature = await client['reprojectItemToStorageCrs']('test-collection', olFeature, 'EPSG:4326');
    expect(reprojectedFeature).toBeDefined();
    const reprojectedCoordinates = (reprojectedFeature.getGeometry() as Point).getCoordinates();
    expect(reprojectedCoordinates[0]).toBeCloseTo(2589456.3, 0);
    expect(reprojectedCoordinates[1]).toBeCloseTo(1205447.9, 0);
  });

  it('should throw error if transformation fails', async () => {
    const olFeature = new Feature();
    olFeature.setGeometry(new Point([NaN, NaN]));
    await expect(client['reprojectItemToStorageCrs']('test-collection', olFeature, 'EPSG:4326')).rejects.toThrow(
      'Not able to reproject geometry:'
    );
  });

  it('should return feature as-is if coordinates are already in storage CRS', async () => {
    const origE = 2600000;
    const origN = 1200000;

    const olFeature = new Feature();
    olFeature.setGeometry(new Point([origE, origN]));

    const reprojectedFeature = await client['reprojectItemToStorageCrs']('test-collection', olFeature, 'EPSG:2056');
    const reprojectedCoordinates = (reprojectedFeature.getGeometry() as Point).getCoordinates();
    expect(reprojectedCoordinates[0]).toEqual(origE);
    expect(reprojectedCoordinates[1]).toEqual(origN);
  });
});
