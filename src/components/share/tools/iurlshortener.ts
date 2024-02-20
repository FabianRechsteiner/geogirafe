export type UrlShortenerResponse = {
  shorturl: string;
  qrcode?: string;
};

export interface IUrlShortener {
  shortenUrl(longUrl: string): Promise<UrlShortenerResponse>;
}
