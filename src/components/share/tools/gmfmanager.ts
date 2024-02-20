import { IUrlShortener, UrlShortenerResponse } from './iurlshortener';

class GmfManager implements IUrlShortener {
  shortenUrl(_longUrl: string): Promise<UrlShortenerResponse> {
    throw new Error('Method not implemented.');
  }
}

export default GmfManager;
