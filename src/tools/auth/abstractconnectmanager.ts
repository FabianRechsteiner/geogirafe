import GirafeSingleton from '../../base/GirafeSingleton';
import ConfigManager from '../configuration/configmanager';
import StateManager from '../state/statemanager';

export default abstract class AbstractConnectManager extends GirafeSingleton {
  protected readonly configManager: ConfigManager;
  protected readonly stateManager: StateManager;

  get state() {
    return this.stateManager.state;
  }

  constructor(type: string) {
    super(type);
    this.configManager = ConfigManager.getInstance();
    this.stateManager = StateManager.getInstance();
  }

  public abstract initialize(): Promise<void>;
  public abstract login(): Promise<void>;
  public abstract silentLogin(): Promise<void>;
  public abstract logout(): Promise<void>;

  protected loggedOutFromBackend() {
    this.state.oauth.status = 'loggedOutForcedFromBackend';
    this.state.oauth.tokens = undefined;
    this.state.oauth.userInfo = undefined;
    this.state.oauth.audience = [];
  }

  protected handleErrorFromIssuer() {
    this.state.oauth.status = 'loggedOut';
    this.state.oauth.tokens = undefined;
    this.state.oauth.userInfo = undefined;
    this.state.oauth.audience = [];
  }
}
