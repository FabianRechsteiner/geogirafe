import GirafeSingleton from '../../base/GirafeSingleton';

export default class ApplicationLifeCycleManager extends GirafeSingleton {
  private get state() {
    return this.context.stateManager.state;
  }

  public override initializeSingleton() {
    this.context.stateManager.subscribe('themes.isLoaded', (_, isThemesLoaded) => {
      this.log(isThemesLoaded, 'Themes are loaded');
      this.checkApplicationReady();
    });
    this.context.stateManager.subscribe('projection', (_, projection) => {
      this.log(projection, 'Projection is initialized');
      this.checkApplicationReady();
    });
    this.context.stateManager.subscribe('position', (_, position) => {
      this.log(position, 'Position is initialized');
      this.checkApplicationReady();
    });
    this.context.stateManager.subscribe('application.isConfigurationLoaded', (_, isConfigurationLoaded) => {
      this.log(isConfigurationLoaded, 'Configuration is loaded');
      this.checkApplicationReady();
    });
    this.context.stateManager.subscribe('application.isStateInitialized', (_, isStateInitialized) => {
      this.log(isStateInitialized, 'Initial state has been initialized');
      this.checkApplicationReady();
    });
    this.context.stateManager.subscribe('application.isAuthInitialized', (_, isAuthInitialized) => {
      this.log(isAuthInitialized, 'Authentication has been initialized');
      this.checkReadyToLoadThemes();
      this.checkApplicationReady();
    });
    this.context.stateManager.subscribe(
      'application.isCustomSerializerInitialized',
      (_, isCustomSerializerInitialized) => {
        this.log(isCustomSerializerInitialized, 'Custom Serializers have been initialized');
        this.checkReadyToLoadThemes();
        this.checkApplicationReady();
      }
    );
  }

  private log(value: boolean, text: string) {
    if (value) {
      console.info(`ApplicationLifeCycle: ${text}`);
    }
  }

  /**
   * For the application to be ready to load the themes and to deserialize the shared state or the session,
   * The following elements must have been prepared:
   * - Custom Serializer
   * - OAuth process done
   */
  private checkReadyToLoadThemes() {
    const isReady = this.state.application.isAuthInitialized && this.state.application.isCustomSerializerInitialized;
    if (isReady) {
      this.state.application.isReadyToLoadThemes = true;
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
      !this.state.application.isAuthInitialized ||
      !this.state.application.isCustomSerializerInitialized
    ) {
      isReady = false;
    }

    if (isReady) {
      this.state.application.isReady = true;
    }
  }
}
