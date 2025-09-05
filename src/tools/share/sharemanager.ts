import GirafeSingleton from '../../base/GirafeSingleton';
import ConfigManager from '../configuration/configmanager';
import UrlManager from '../url/urlmanager';
import SessionManager from './sessionmanager';
import StateSerializer from './stateserializer';

class ShareManager extends GirafeSingleton {
  private readonly configManager: ConfigManager;
  private readonly stateSerializer: StateSerializer;

  constructor(type: string) {
    super(type);
    this.stateSerializer = StateSerializer.getInstance();
    this.configManager = ConfigManager.getInstance();
  }

  public getStateToShare() {
    const encodedState = this.stateSerializer.getSerializedState();
    return encodedState;
  }

  public hasSharedState() {
    const encodedState = this.getStateFromUrl();
    return encodedState !== null;
  }

  private getStateFromUrl(): string | null {
    if (SessionManager.getInstance().hasState()) {
      return null;
    }
    return UrlManager.getInstance().getHash();
  }

  public async setStateFromUrl(): Promise<boolean> {
    // NOTE: This method should only be called when themes.json has been loaded
    // (i.e. from the ThemesManager), because it needs the themes.
    let encodedState = this.getStateFromUrl();
    let stateRestored = false;
    if (encodedState) {
      if (encodedState.startsWith('gg-')) {
        // The hash contains a shortlink identifier.
        // We first have to load the hash from the GMF server
        encodedState = await this.getStateFromServer(encodedState);
      }
      stateRestored = this.stateSerializer.deserializeAndSetState(encodedState);
    }
    return stateRestored;
  }

  private async getStateFromServer(geogirafeState: string): Promise<string> {
    if (this.configManager.Config.share?.service !== 'geogirafe' || !this.configManager.Config.share.getUrl) {
      throw new Error('We get a geogirafe state but the configuration is not correct.');
    }
    let getUrl = this.configManager.Config.share.getUrl;
    if (!getUrl.endsWith('/')) {
      getUrl += '/';
    }
    getUrl += geogirafeState.substring(3);
    const resp = await fetch(getUrl);
    const json = await resp.json();
    const compressedState = json.long_url.split('#')[1];
    return compressedState;
  }
}

export default ShareManager;
