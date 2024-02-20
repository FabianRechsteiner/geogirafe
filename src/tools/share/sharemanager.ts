import GirafeSingleton from '../../base/GirafeSingleton';
import LayerManager from '../layermanager';
import StateManager from '../state/statemanager';
import StateDeserializer from './statedeserializer';
import StateSerializer from './stateserializer';

class ShareManager extends GirafeSingleton {
  stateManager: StateManager;
  layerManager: LayerManager;
  serializer: StateSerializer;
  deserializer: StateDeserializer;

  constructor(type: string) {
    super(type);
    this.stateManager = StateManager.getInstance();
    this.layerManager = LayerManager.getInstance();
    this.serializer = new StateSerializer();
    this.deserializer = new StateDeserializer();
  }

  public getStateToShare() {
    const encodedState = this.serializer.getSerializedState(this.stateManager.state);
    return encodedState;
  }

  public hasSharedState() {
    const encodedState = this.getStateFromUrl();
    return encodedState !== null;
  }

  private getStateFromUrl(): string | null {
    let encodedState = window.location.hash;
    if (encodedState && encodedState.length > 0) {
      if (encodedState.startsWith('#')) {
        encodedState = encodedState.substring(1);
      }
      if (encodedState.length > 0) {
        return encodedState;
      }
    }

    return null;
  }

  public setStateFromUrl() {
    // NOTE: This method should only be called when themes.json has been loaded
    // (i.e. from the ThemesManager), because it needs the themes.
    const encodedState = this.getStateFromUrl();
    if (encodedState) {
      this.deserializer.deserializeAndSetState(encodedState);
    }
  }
}

export default ShareManager;
