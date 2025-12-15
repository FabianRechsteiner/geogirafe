import { generateQrCode } from '../../../tools/utils/qrcode';
import { IUrlShortener, UrlShortenerResponse } from './iurlshortener';

export type GmfSuccessResponse = {
  short_url: string;
};

class GmfShareManager implements IUrlShortener {
  serviceUrl: string;

  public constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl;
  }

  async shortenUrl(longUrl: string): Promise<UrlShortenerResponse> {
    const errorResponse = {
      success: false,
      shorturl: longUrl
    };

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
    const shortUrl = response_data.short_url;
    const qrcode = await generateQrCode(shortUrl);
    if (response_data) {
      return {
        success: true,
        shorturl: response_data.short_url,
        qrcode: qrcode
      };
    }
    return errorResponse;
  }
}

export default GmfShareManager;
