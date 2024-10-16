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

  public abstract initialize(): void;
  public abstract login(): Promise<void>;
  public abstract silentLogin(): Promise<void>;
  public abstract logout(): Promise<void>;
}
