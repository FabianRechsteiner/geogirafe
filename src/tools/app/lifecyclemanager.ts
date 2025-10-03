import GirafeSingleton from '../../base/GirafeSingleton';
import StateManager from '../state/statemanager';

export default class ApplicationLifeCycleManager extends GirafeSingleton {
  private readonly stateManager: StateManager = StateManager.getInstance();

  private get state() {
    return this.stateManager.state;
  }
  constructor(type: string) {
    super(type);

    this.stateManager.subscribe('themes.isLoaded', (_, newValue) => {
      this.log(newValue, 'Themes are loaded');
      this.checkApplicationReady();
    });
    this.stateManager.subscribe('projection', (_, newValue) => {
      this.log(newValue, 'Projection is initialized');
      this.checkApplicationReady();
    });
    this.stateManager.subscribe('position', (_, newValue) => {
      this.log(newValue, 'Position is initialized');
      this.checkApplicationReady();
    });
    this.stateManager.subscribe('application.isConfigurationLoaded', (_, newValue) => {
      this.log(newValue, 'Configuration is loaded');
      this.checkApplicationReady();
    });
    this.stateManager.subscribe('application.isStateInitialized', (_, newValue) => {
      this.log(newValue, 'Initial state has been initialized');
      this.checkApplicationReady();
    });
    this.stateManager.subscribe('application.isAuthInitialized', (_, newValue) => {
      this.log(newValue, 'Authentication has been initialized');
      this.checkApplicationReady();
    });
  }

  private log(value: boolean, text: string) {
    if (value) {
      console.info(`ApplicationLifeCycle: ${text}`);
    }
  }

  /**
   * For the application to be ready for usage, following elements must have been loaded:
   * - Configuration (config.json)
   * - Themes
   * - Initial position, projection and resolution
   * - Initial state (shared, session or default)
   */
  private checkApplicationReady() {
    let isReady = true;

    if (
      !this.state.application.isConfigurationLoaded ||
      !this.state.themes.isLoaded ||
      !this.state.projection ||
      !this.state.position.resolution ||
      !this.state.application.isStateInitialized ||
      !this.state.application.isAuthInitialized
    ) {
      isReady = false;
    }

    if (isReady) {
      this.state.application.isReady = true;
    }
  }
}
