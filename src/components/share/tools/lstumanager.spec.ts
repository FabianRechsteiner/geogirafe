import { describe, it, expect, vi } from 'vitest';
import LstuManager from './lstumanager';

global.fetch = vi.fn();

function createFetchErrorResponse(data: any) {
  return { json: () => new Promise((resolve) => resolve(data)) };
}

describe('LstuManager.shortenUrl', () => {
  const lstuErrorResponse = {
    success: false
  };
  const lstuManager = new LstuManager('http://example.com');
  const params = new URLSearchParams();
  const longUrl = 'http://example.ch/longUrl';
  params.append('lsturl', longUrl);
  params.append('format', 'json');

  it('should return the original URL if success is false', async () => {
    // @ts-ignore
    fetch.mockResolvedValue(createFetchErrorResponse(lstuErrorResponse));
    const response = await lstuManager.shortenUrl(longUrl);

    expect(fetch).toHaveBeenCalledWith('http://example.com', {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/x-www-form-urlencoded'
      }),
      body: params
    });

    expect(response).toStrictEqual({
      success: false,
      shorturl: longUrl
    });
  });
});
