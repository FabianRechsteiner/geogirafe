import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import MockHelper from '../tests/mockhelper';
import { OgcApiOptions } from './ogcapiclient';
import OgcApiFeaturesClient from './ogcapifeaturesclient';

describe('OgcApiClient', () => {
  beforeAll(() => {
    MockHelper.startMocking();
  });
  afterAll(() => {
    MockHelper.stopMocking();
  });
  let client: OgcApiFeaturesClient;
  const mockUrl = 'https://example.com';
  const options: OgcApiOptions = { url: mockUrl };

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
    client = new OgcApiFeaturesClient(options);
  });

  it('should fetch conformance successfully', async () => {
    const mockConformance = { conformsTo: ['link1', 'link2'] };
    vi.spyOn(client, 'getLink').mockResolvedValue('https://example.com/conformance');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockConformance
    });

    const result = await client.conformance();
    expect(result).toEqual(mockConformance['conformsTo']);
    expect(client.getLink).toHaveBeenCalledWith('conformance');
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/conformance', expect.any(Object));
  });

  it('should throw an error when conformance fetch fails', async () => {
    vi.spyOn(client, 'getLink').mockResolvedValue('https://example.com/conformance');
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    await expect(client.conformance()).rejects.toThrow('Failed to get conformance: 404 - Not Found');
  });

  it('should fetch links successfully', async () => {
    const mockLinksResponse = { links: [{ rel: 'self', href: 'https://example.com', type: 'application/json' }] };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockLinksResponse
    });

    const result = await client.getLinks(mockUrl);
    expect(result).toEqual(mockLinksResponse.links);
    expect(global.fetch).toHaveBeenCalledWith(mockUrl, expect.any(Object));
  });

  it('should throw an error when links fetch fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(client.getLinks(mockUrl)).rejects.toThrow('Failed to get links: 500 - Internal Server Error');
  });

  it('should get a specific link based on rel', async () => {
    const mockLinks = {
      links: [
        { rel: 'self', href: 'https://example.com', type: 'application/json' },
        { rel: 'conformance', href: 'https://example.com/conformance', type: 'application/json' }
      ]
    };

    vi.spyOn(client, 'getLinks').mockResolvedValue(mockLinks.links);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockLinks
    });

    const result = await client.getLink('conformance', mockUrl);
    expect(result).toBe('https://example.com/conformance');
    expect(client.getLinks).toHaveBeenCalledWith(mockUrl);
  });

  it('should throw an error if no matching link is found', async () => {
    const mockLinks = [{ rel: 'self', href: 'https://example.com', type: 'application/json' }];
    vi.spyOn(client, 'getLinks').mockResolvedValue(mockLinks);

    await expect(client.getLink('nonexistent', mockUrl)).rejects.toThrow(
      "OGC API resource at 'https://example.com' does not support 'nonexistent'"
    );
  });

  it('should generate correct fetch options for GET method', () => {
    const options = client['getFetchOptions']('GET');
    expect(options.method).toBe('GET');
  });
});
