import StateManager from '../state/statemanager';
import GirafeSingleton from '../../base/GirafeSingleton';

class PluginManager extends GirafeSingleton {
  stateManager: StateManager;

  constructor(type: string) {
    super(type);

    this.stateManager = StateManager.getInstance();

    this.stateManager.subscribe('oauth.userInfo', () => this.filterPlugins(document));
    this.filterPlugins(document);
  }

  public filterPlugins(dom: DocumentFragment | Document) {
    const linkedToPlugin = dom.querySelectorAll('[plugin]');
    linkedToPlugin.forEach((item) => {
      const pluginName = item.getAttribute('plugin');
      if (pluginName) {
        if (!this.stateManager.state.oauth.userInfo?.functionalities?.authorized_plugins?.includes(pluginName)) {
          // Plugin is not activated for the user
          item.classList.add('hidden');
        } else {
          item.classList.remove('hidden');
        }
      }
    });
  }
}

export default PluginManager;
