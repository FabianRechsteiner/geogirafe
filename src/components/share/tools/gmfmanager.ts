import { IUrlShortener, UrlShortenerResponse } from './iurlshortener';

type GmfSuccessResponse = {
  short_url: string;
};

class GmfManager implements IUrlShortener {
  serviceUrl: string;

  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl;
  }

  async shortenUrl(longUrl: string): Promise<UrlShortenerResponse> {
    const errorResponse = {
      success: false,
      shorturl: longUrl
    };

    try {
      const params = new URLSearchParams();
      params.append('url', longUrl);
      const response = await fetch(this.serviceUrl, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/x-www-form-urlencoded'
        }),
        body: params
      });

      const response_data = (await response.json()) as GmfSuccessResponse;
      if (response_data) {
        return {
          success: true,
          shorturl: response_data.short_url
        };
      }

      return errorResponse;
    } catch (error) {
      return errorResponse;
    }
  }
}

export default GmfManager;
