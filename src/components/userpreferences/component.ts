import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { UserPreference } from './userPreference';
import I18nManager from '../../tools/i18n/i18nmanager';

import checkedIcon from '../../assets/icons/checked-full.svg?raw';
import noCheckedIcon from '../../assets/icons/checked-no.svg?raw';
import { getPropertyByPath, setPropertyByPath } from '../../tools/utils/pathUtils';

/**
 Lets users change (default) configuration values, updates the state accordingly and saves the changes in the local
 browser storage.
 */
export default class UserPreferencesComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../styles/common.css'];

  checkedIcon: string = checkedIcon;
  noCheckedIcon: string = noCheckedIcon;

  visible = false;

  preferences: Record<string, UserPreference>;

  constructor() {
    super('user-preferences');

    this.preferences = {
      language: new UserPreference('language', 'languages.defaultLanguage'),
      projection: new UserPreference('projection', 'map.srid'),
      darkFrontendMode: new UserPreference('interface.darkFrontendMode', 'interface.darkFrontendMode')
    };
  }

  connectedCallback(): void {
    this.loadConfig().then(() => {
      this.render();
      this.subscribe('interface.userPreferencesPanelVisible', (_, newValue) => this.togglePanel(newValue));
    });
  }

  render(): void {
    this.visible ? this.renderComponent() : this.hide();
  }

  private renderComponent(): void {
    if (!this.rendered) {
      this.initPreferenceOptions();
      this.initCurrentPreferenceValues();
    }
    super.render();
    this.activateTooltips(false, [800, 0], 'top-end');
    super.girafeTranslate();
  }

  private togglePanel(visible: boolean): void {
    this.visible = visible;
    this.render();
  }

  /**
   For preferences that have options to choose from, readout all possible select options to show in the dropdowns
   */
  private initPreferenceOptions(): void {
    this.preferences.language.options = Object.keys(this.configManager.Config.languages.translations).map((key) => {
      return { label: key, value: key };
    });

    this.preferences.projection.options = Object.keys(this.configManager.Config.projections).map((key) => {
      return { label: this.configManager.Config.projections[key], value: key };
    });
  }

  /**
   Readout the current value from the state or the config to show in the template
   */
  private initCurrentPreferenceValues(): void {
    let result;
    for (const key in this.preferences) {
      if (this.preferences[key].statePath) {
        result = getPropertyByPath(this.state, this.preferences[key].statePath);
      }
      if (!result?.found && this.preferences[key].configPath) {
        result = getPropertyByPath(this.configManager.Config, this.preferences[key].configPath);
      }
      if (result?.found && result.parentObject && result.lastKey) {
        this.preferences[key].currentValue = result.parentObject[result.lastKey];
      }
    }
  }

  /**
   Called when user changes a preference in the panel
   */
  onChangePreferenceFromEvent(preferenceKey: string, evt: Event): void {
    const newValue = (evt.target as HTMLInputElement)?.value;
    this.changePreference(preferenceKey, newValue);
  }

  /**
   Update state and local storage with new value
   */
  changePreference(preferenceKey: string, newValue: unknown): void {
    if (!Object.keys(this.preferences).includes(preferenceKey)) {
      return;
    }
    this.preferences[preferenceKey].currentValue = newValue;
    this.updatePreferenceInState(this.preferences[preferenceKey].statePath, newValue);
    this.updatePreferenceInStorage(this.preferences[preferenceKey].configPath, newValue);
    this.refreshRender();
  }

  /**
   Update the state with the new value
   */
  private updatePreferenceInState(path: string, newValue: unknown): void {
    if (path) {
      setPropertyByPath(this.state, path, newValue);
    }
  }

  /**
   Save the user preference as a partial config object in the local browser storage
   */
  private updatePreferenceInStorage(path: string, newValue: unknown): void {
    if (path) {
      this.configManager.saveUserPreference(path, newValue);
    }
  }

  /**
   * Reset user preferences back to defaults. This will delete the data in the local storage and set the current state
   * back to the defaults from config.json
   */
  public onResetAll(): void {
    const confirmMsg = I18nManager.getInstance().getTranslation('Reset user preferences back to default values?');
    if (confirm(confirmMsg)) {
      this.configManager.clearUserPreferences();
      for (const preferenceKey in this.preferences) {
        const defaultValue = this.configManager.getDefaultConfigValue(this.preferences[preferenceKey].configPath);
        this.preferences[preferenceKey].currentValue = defaultValue;
        this.updatePreferenceInState(this.preferences[preferenceKey].statePath, defaultValue);
      }
      this.render();
    }
  }
}
