import GirafeSingleton from '../../base/GirafeSingleton';
import ServerOgcApi from '../../models/serverogcapi';

export default abstract class OgcApiManager<OgcApiClient, OgcApiClientOptions> extends GirafeSingleton {
  protected readonly _clientClasses: Map<
    string,
    new (server: ServerOgcApi, options: OgcApiClientOptions) => OgcApiClient
  > = new Map();
  protected readonly _clients: Map<string, OgcApiClient> = new Map();

  public abstract getClientId(server: ServerOgcApi): string;

  public createClient(
    clientClass: new (os: ServerOgcApi, opt: OgcApiClientOptions) => OgcApiClient,
    server: ServerOgcApi
  ): OgcApiClient {
    return new clientClass(server, {} as OgcApiClientOptions);
  }

  // Register a client with an identifier
  public registerClientClass(
    type: string,
    clientClass: new (server: ServerOgcApi, opt: OgcApiClientOptions) => OgcApiClient
  ) {
    this._clientClasses.set(type, clientClass);
  }

  // Get a client based on the identifier
  public getClient(server: ServerOgcApi): OgcApiClient {
    // public getClient(layer: LayerOapif): OgcApiClient
    // public getClient(object: ServerOgcApi | LayerOapif): OgcApiClient
    //   const server = object instanceof ServerOgcApi ? object.type : object;
    const type = server.type;
    const clientId = this.getClientId(server);
    let client = this._clients.get(clientId);
    if (!client) {
      let clientClass = this._clientClasses.get(type);
      if (!clientClass) {
        console.info(`Client not found for ogcServer with type: ${type}. Using default client. ogcServer: ${server}. `);
        clientClass = this._clientClasses.get('default')!;
      }
      client = this.createClient(clientClass, server);
      this._clients.set(clientId, client);
    }
    return client;
  }
}
