import UrlManager from '../../../tools/url/urlmanager';
import { GmfSuccessResponse } from './gmfsharemanager';
import { IUrlShortener, UrlShortenerResponse } from './iurlshortener';
import { generateQrCode } from '../../../tools/utils/qrcode';

class GeoGirafeShareManager implements IUrlShortener {
  private readonly serviceUrl: string;
  private readonly urlManager: UrlManager;

  constructor(serviceUrl: string, urlManager: UrlManager) {
    this.serviceUrl = serviceUrl;
    this.urlManager = urlManager;
  }

  async shortenUrl(longUrl: string, indexDocument?: string): Promise<UrlShortenerResponse> {
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
        const baseUrl = this.urlManager.getBaseUrlPath();
        const hash = response_data.short_url.split('/').pop();
        const shortUrl = `${baseUrl}${indexDocument ?? ''}#gg-${hash}`;
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
