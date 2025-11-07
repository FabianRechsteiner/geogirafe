export type UrlShortenerResponse = {
  success: boolean;
  shorturl: string;
  qrcode?: string;
};

export interface IUrlShortener {
  shortenUrl(longUrl: string, indexDocument?: string): Promise<UrlShortenerResponse>;
}
