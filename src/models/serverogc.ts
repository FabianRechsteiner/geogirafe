import { GMFServerOgc } from './gmf';

export default class ServerOgc {
  name: string;
  url: string;
  wfsSupport: boolean;
  urlWfs?: string;
  type: string;
  imageType: string;
  aliases: Map<string, string>;

  constructor(name: string, elem: GMFServerOgc) {
    this.name = name;
    this.url = elem.url;
    this.wfsSupport = elem.wfsSupport;
    this.urlWfs = elem.urlWfs;
    this.type = elem.type;
    this.imageType = elem.imageType;

    this.aliases = this.initializeAliases(elem);
  }

  private getAliasKey(table: string, column: string) {
    return `${table}-${column}`;
  }

  private initializeAliases(elem: GMFServerOgc): Map<string, string> {
    const aliases = new Map<string, string>();
    if (elem.attributes) {
      for (const [table, columns] of Object.entries(elem.attributes)) {
        for (const [column, attributes] of Object.entries(columns)) {
          if (attributes.alias) {
            aliases.set(this.getAliasKey(table, column), attributes.alias);
          }
        }
      }
    }
    return aliases;
  }

  public getAlias(table: string, column: string) {
    const key = this.getAliasKey(table, column);
    return this.aliases.get(key);
  }

  get uniqueWmsQueryId(): string {
    return this.name + this.imageType;
  }
}
