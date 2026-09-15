// SPDX-License-Identifier: Apache-2.0
import { GMFServerOgc } from './gmf';

export default class ServerOgc {
  public name: string;
  public url: string;
  public projection?: string;
  public wfsSupport: boolean;
  public urlWfs?: string;
  public oapifSupport: boolean;
  public urlOapif?: string;
  public type: 'mapserver' | 'qgisserver' | 'georama' | 'geoserver' | 'arcgis' | 'other';
  public imageType: string;
  public aliases: Record<string, string>;

  public constructor(name: string, elem: GMFServerOgc) {
    this.name = name;
    this.url = elem.url;
    this.projection = elem.projection;
    this.wfsSupport = elem.wfsSupport;
    this.urlWfs = elem.urlWfs;
    this.oapifSupport = elem.oapifSupport ?? false;
    this.urlOapif = elem.urlOapif;
    this.type = elem.type;
    this.imageType = elem.imageType;

    this.aliases = this.initializeAliases(elem);
  }

  private getAliasKey(table: string, column: string): string {
    return `${table}-${column}`;
  }

  private initializeAliases(elem: GMFServerOgc): Record<string, string> {
    const aliases: Record<string, string> = {};
    if (elem.attributes) {
      for (const [table, columns] of Object.entries(elem.attributes)) {
        for (const [column, attributes] of Object.entries(columns)) {
          if (attributes.alias) {
            aliases[this.getAliasKey(table, column)] = attributes.alias;
          }
        }
      }
    }
    return aliases;
  }

  public getAlias(table: string, column: string) {
    const key = this.getAliasKey(table, column);
    return this.aliases[key];
  }

  public get uniqueWmsQueryId(): string {
    return this.name + this.imageType;
  }
}
