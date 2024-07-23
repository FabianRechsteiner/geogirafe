import { IUrlShortener, UrlShortenerResponse } from './iurlshortener';

type LstuBaseResponse = {
  success: boolean;
};

type LstuResponse = LstuBaseResponse & Record<string, unknown>;

type LstuSuccessResponse = {
  short: string;
  qrcode: string;
  success: boolean;
  url: string;
};

class LstuManager implements IUrlShortener {
  serviceUrl: string;

  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl;
  }

  async shortenUrl(longUrl: string): Promise<UrlShortenerResponse> {
    const params = new URLSearchParams();
    params.append('lsturl', longUrl);
    params.append('format', 'json');

    const errorResponse = {
      success: false,
      shorturl: longUrl
    };

    try {
      const response = await fetch(this.serviceUrl, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/x-www-form-urlencoded'
        }),
        body: params
      });

      const response_data = (await response.json()) as LstuResponse;
      if (response_data.success) {
        const data = response_data as LstuSuccessResponse;
        return {
          success: true,
          shorturl: data.short,
          qrcode: `data:image/png;base64, ${data.qrcode}`
        };
      }
      return errorResponse;
    } catch (error) {
      return errorResponse;
    }
  }
}

export default LstuManager;
