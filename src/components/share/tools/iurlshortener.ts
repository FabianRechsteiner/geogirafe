// SPDX-License-Identifier: Apache-2.0
export type UrlShortenerResponse = {
  success: boolean;
  shorturl: string;
  qrcode?: string;
};

export interface IUrlShortener {
  shortenUrl(longUrl: string, indexDocument?: string): Promise<UrlShortenerResponse>;
}
