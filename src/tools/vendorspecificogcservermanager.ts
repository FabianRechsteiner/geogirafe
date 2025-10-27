import GirafeSingleton from '../base/GirafeSingleton';
import LayerWms from '../models/layers/layerwms';
import ServerOgc from '../models/serverogc';
import IGirafeContext from './context/icontext';

export default abstract class VendorSpecificOgcServerManager<
  OgcServerClient,
  OgcClientOptions
> extends GirafeSingleton {
  protected readonly _clientClasses: Map<
    string,
    new (ogcServer: ServerOgc, options: OgcClientOptions, context: IGirafeContext) => OgcServerClient
  > = new Map();
  protected readonly _clients: Map<string, OgcServerClient> = new Map();

  public abstract getClientId(ogcServer: ServerOgc): string;
  public createClient(
    clientClass: new (os: ServerOgc, opt: OgcClientOptions, context: IGirafeContext) => OgcServerClient,
    ogcServer: ServerOgc
  ): OgcServerClient {
    return new clientClass(ogcServer, {} as OgcClientOptions, this.context);
  }

  // Register a client with an identifier
  public registerClientClass(
    type: string,
    clientClass: new (ogcServer: ServerOgc, opt: OgcClientOptions, context: IGirafeContext) => OgcServerClient
  ) {
    this._clientClasses.set(type, clientClass);
  }

  // Get a client based on the identifier
  public getClient(ogcServer: ServerOgc): OgcServerClient;
  public getClient(layerWms: LayerWms): OgcServerClient;
  public getClient(object: ServerOgc | LayerWms): OgcServerClient {
    const ogcServer = object instanceof LayerWms ? object.ogcServer : object;
    const type = ogcServer.type;
    const clientId = this.getClientId(ogcServer);
    let client = this._clients.get(clientId);
    if (!client) {
      let clientClass = this._clientClasses.get(type);
      if (!clientClass) {
        console.info(
          `Client not found for ogcServer with type: ${type}. Using default client. ogcServer: ${ogcServer}. `
        );
        clientClass = this._clientClasses.get('default')!;
      }
      client = this.createClient(clientClass, ogcServer);
      this._clients.set(clientId, client);
    }
    return client;
  }
}
