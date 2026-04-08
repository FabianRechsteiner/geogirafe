// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import MockHelper from '../tests/mockhelper';
import OgcApiFeaturesClient from './ogcapifeaturesclient';
import ServerOgc from '../../models/serverogc';
import IGirafeContext from '../context/icontext';

// Since OgcApiClient is an abstract class, it's methods are tested with an instance of OgcApiFeaturesClient
let client: OgcApiFeaturesClient;
const mockUrl = 'https://example.com';
const server: ServerOgc = new ServerOgc('test', {
  url: mockUrl,
  wfsSupport: false,
  urlWfs: '',
  oapifSupport: true,
  urlOapif: mockUrl,
  type: 'qgisserver',
  imageType: ''
});
let context: IGirafeContext;

beforeAll(() => {
  context = MockHelper.startMocking();
});
afterAll(() => {
  MockHelper.stopMocking(context);
});
beforeEach(() => {
  vi.resetAllMocks();
  globalThis.fetch = vi.fn();
  client = new OgcApiFeaturesClient(server, {}, context);
});

describe('OgcApiClient.loadConformance', () => {
  it('should retrieve conformance successfully', async () => {
    const mockConformance = {
      conformsTo: ['http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core']
    };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockConformance
    });

    const result = await client.loadConformance();
    expect(result).toEqual(mockConformance.conformsTo);
    expect(globalThis.fetch).toHaveBeenCalledWith(`${mockUrl}/conformance?f=json`, expect.any(Object));
  });

  it('should throw an error if network request fails', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(client.loadConformance()).rejects.toThrow('Failed to get conformance: 500 - Internal Server Error');
  });

  it('should throw an error if response is invalid', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({})
    });

    const result = await client.loadConformance();
    expect(result).toEqual([]);
  });

  it('should correctly establish the conformance level of the server', async () => {
    const mockConformance = {
      conformsTo: [
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/html',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/json',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/landing-page',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/oas30',
        'http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/collections',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/html',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30',
        'http://www.opengis.net/spec/ogcapi-features-2/1.0/conf/crs',
        'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/queryables',
        'http://www.opengis.net/spec/ogcapi-features-3/1.0/conf/queryables-query-parameters',
        'http://www.opengis.net/spec/ogcapi-features-4/1.0/conf/create-replace-delete',
        'http://www.opengis.net/spec/ogcapi-features-5/1.0/conf/core-roles-features',
        'http://www.opengis.net/spec/ogcapi-features-5/1.0/conf/schemas'
      ]
    };
    vi.spyOn(client, 'getLink').mockResolvedValue(`${mockUrl}/conformance`);
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockConformance
    });

    const server = await client.getServer();
    expect(server.conformsTo?.ogcapi_features_read).toBe(true);
    expect(server.conformsTo?.ogcapi_features_query).toBe(true);
    expect(server.conformsTo?.ogcapi_features_simple_write).toBe(true);
    expect(server.conformsTo?.ogcapi_features_advanced_write).toBe(false);
  });
});

describe('OgcApiClient.links', () => {
  it('should fetch links successfully', async () => {
    const mockLinksResponse = { links: [{ rel: 'self', href: mockUrl, type: 'application/json' }] };
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockLinksResponse
    });

    const result = await client.getLinks(mockUrl);
    expect(result).toEqual(mockLinksResponse.links);
    expect(globalThis.fetch).toHaveBeenCalledWith(mockUrl, expect.any(Object));
  });

  it('should throw an error when links fetch fails', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(client.getLinks(mockUrl)).rejects.toThrow('Failed to get links: 500 - Internal Server Error');
  });

  it('should get a specific link based on a relation', async () => {
    const mockLinks = {
      links: [
        { rel: 'self', href: mockUrl, type: 'application/json' },
        { rel: 'conformance', href: `${mockUrl}/conformance`, type: 'application/json' }
      ]
    };

    vi.spyOn(client, 'getLinks').mockResolvedValue(mockLinks.links);
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockLinks
    });

    const result = await client.getLink('conformance', mockUrl);
    expect(result).toBe(`${mockUrl}/conformance`);
    expect(client.getLinks).toHaveBeenCalledWith(mockUrl);
  });

  it('should throw an error if no matching link is found', async () => {
    const mockLinks = [{ rel: 'self', href: mockUrl, type: 'application/json' }];
    vi.spyOn(client, 'getLinks').mockResolvedValue(mockLinks);

    await expect(client.getLink('nonexistent', mockUrl)).rejects.toThrow(
      `OGC API resource at '${mockUrl}' does not support 'nonexistent'`
    );
  });

  it('should generate correct fetch options for GET method', () => {
    const options = client['getFetchOptions']('GET');
    expect(options.method).toBe('GET');
  });

  it('should sanitize links that have a different URL than the original request URL', async () => {
    const requestUrl = `${mockUrl}/api/collections/123456`;
    const wrongLink = 'https://1234-example.com/wrong';
    const mockLinksResponse = {
      links: [
        { rel: 'self', href: `${wrongLink}/api/collections/123456`, type: 'application/json' },
        { rel: 'conformance', href: `${wrongLink}/api/conformance`, type: 'application/json' },
        { rel: 'items', href: `${wrongLink}/api/collections/123456/items`, type: 'application/json' }
      ]
    };

    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockLinksResponse
    });

    const result = await client.getLinks(requestUrl);

    const sanitizedItemsLink = result.find((link) => link.rel === 'items')?.href;
    expect(sanitizedItemsLink).toBe(`${requestUrl}/items`);

    const sanitizedConformanceLink = result.find((link) => link.rel === 'conformance')?.href;
    expect(sanitizedConformanceLink).toBe(`${mockUrl}/api/conformance`);
  });
});
