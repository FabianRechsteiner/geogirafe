import { GMFServerOgc } from './gmf';

export default class ServerOgc {
  name: string;
  url: string;
  wfsSupport: boolean;
  urlWfs?: string;
  type: string;
  imageType: string;

  constructor(name: string, elem: GMFServerOgc) {
    this.name = name;
    this.url = elem.url;
    this.wfsSupport = elem.wfsSupport;
    this.urlWfs = elem.urlWfs;
    this.type = elem.type;
    this.imageType = elem.imageType;
  }

  get uniqueWmsQueryId(): string {
    return this.name + this.imageType;
  }
}
