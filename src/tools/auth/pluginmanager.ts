import StateManager from '../state/statemanager';
import GirafeSingleton from '../../base/GirafeSingleton';
import ConfigManager from '../configuration/configmanager';
import GirafeConfig from '../configuration/girafeconfig';

class PluginManager extends GirafeSingleton {
  stateManager: StateManager;
  configManager: ConfigManager;

  constructor(type: string) {
    super(type);

    this.stateManager = StateManager.getInstance();
    this.configManager = ConfigManager.getInstance();

    this.stateManager.subscribe('oauth.userInfo', () => this.filterPlugins(document));
    this.filterPlugins(document);
  }

  public filterPlugins(dom: DocumentFragment | Document) {
    const linkedToPlugin = dom.querySelectorAll('[plugin]');
    linkedToPlugin.forEach((item) => {
      const pluginName = item.getAttribute('plugin');
      if (pluginName) {
        if (pluginName.startsWith('config:')) {
          this.filterPluginFromConfig(item, pluginName.split(':')[1] as keyof GirafeConfig);
        } else {
          this.filterPlugin(item, pluginName);
        }
      }
    });
  }

  private filterPluginFromConfig(item: Element, configName: keyof GirafeConfig) {
    if (this.configManager.Config[configName]) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  }

  private filterPlugin(item: Element, pluginName: string) {
    if (!this.stateManager.state.oauth.userInfo?.functionalities?.authorized_plugins?.includes(pluginName)) {
      // Plugin is not activated for the user
      item.classList.add('hidden');
    } else {
      item.classList.remove('hidden');
    }
  }
}

export default PluginManager;
