import GirafeSingleton from '../../base/GirafeSingleton';

class ShareManager extends GirafeSingleton {
  public getStateToShare() {
    const encodedState = this.context.stateSerializer.getSerializedState();
    return encodedState;
  }

  public hasSharedState() {
    const encodedState = this.getStateFromUrl();
    return encodedState !== null;
  }

  private getStateFromUrl(): string | null {
    if (this.context.sessionManager.hasState()) {
      return null;
    }
    return this.context.urlManager.getHash();
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
      stateRestored = this.context.stateSerializer.deserializeAndSetState(encodedState);
    }
    return stateRestored;
  }

  private async getStateFromServer(geogirafeState: string): Promise<string> {
    if (
      this.context.configManager.Config.share?.service !== 'geogirafe' ||
      !this.context.configManager.Config.share.getUrl
    ) {
      throw new Error('We get a geogirafe state but the configuration is not correct.');
    }
    let getUrl = this.context.configManager.Config.share.getUrl;
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
