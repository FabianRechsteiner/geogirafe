import UrlManager from '../../../tools/url/urlmanager';
import { GmfSuccessResponse } from './gmfmanager';
import { IUrlShortener, UrlShortenerResponse } from './iurlshortener';
import { generateQrCode } from '../../../tools/utils/qrcode';

class GeoGirafeShareManager implements IUrlShortener {
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
        const baseUrl = UrlManager.getInstance().getBaseUrlPath();
        const hash = response_data.short_url.split('/').pop();
        const shortUrl = `${baseUrl}#gg-${hash}`;
        const qrcode = await generateQrCode(shortUrl);
        return {
          success: true,
          shorturl: shortUrl,
          qrcode: qrcode
        };
      }

      return errorResponse;
    } catch (error) {
      console.error('Error while shortening URL:', error);
      return errorResponse;
    }
  }
}

export default GeoGirafeShareManager;
