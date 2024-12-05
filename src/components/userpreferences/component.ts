import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { PreferenceGroup, PreferenceGroups, PreferenceOption, UserPreference } from './userPreference';
import CustomThemesManager from '../../tools/themes/customthemesmanager';
import CustomTheme from '../../models/customtheme';
import { getPropertyByPath, setPropertyByPath } from '../../tools/utils/pathUtils';
import { Color } from 'vanilla-picker';
import GirafeColorPicker from '../../tools/utils/girafecolorpicker';

import checkedIcon from '../../assets/icons/checked-full.svg?raw';
import noCheckedIcon from '../../assets/icons/checked-no.svg?raw';

/**
 Lets users change (default) configuration values, updates the state accordingly and saves the changes in the local
 browser storage.
 */
export default class UserPreferencesComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  checkedIcon: string = checkedIcon;
  noCheckedIcon: string = noCheckedIcon;

  visible = false;
  ready: boolean = false;
  preferences: Record<string, UserPreference>;
  preferenceGroups: PreferenceGroup[] = PreferenceGroups;
  colorPickers: Record<string, GirafeColorPicker> = {};

  customThemesManager: CustomThemesManager;

  constructor() {
    super('user-preferences');

    this.customThemesManager = CustomThemesManager.getInstance();

    this.preferences = {
      language: new UserPreference('languages.defaultLanguage', 'language', 'system', 'select'),
      logLevel: new UserPreference('general.logLevel', null, 'system', 'select'),
      theme: new UserPreference('themes.defaultTheme', 'theme', 'map', 'select', (themeName: string) => {
        const themeId = Object.keys(this.state.themes._allThemes).find(
          (themeKey) => this.state.themes._allThemes[Number(themeKey)].name === themeName
        );
        return this.state.themes._allThemes[Number(themeId)];
      }),
      basemap: new UserPreference('basemaps.defaultBasemap', 'activeBasemap', 'map', 'select', (bsName: string) => {
        const bsId = Object.keys(this.state.basemaps).find(
          (bsKey) => this.state.basemaps[Number(bsKey)].name === bsName
        );
        return this.state.basemaps[Number(bsId)];
      }),
      projection: new UserPreference('map.srid', 'projection', 'map', 'select'),
      darkFrontendMode: new UserPreference(
        'interface.darkFrontendMode',
        'interface.darkFrontendMode',
        'visual',
        'select'
      ),
      darkMapMode: new UserPreference('interface.darkMapMode', 'interface.darkMapMode', 'visual', 'checkbox'),
      selectionComponent: new UserPreference(
        'interface.defaultSelectionComponent',
        'interface.selectionComponent',
        'visual',
        'select'
      ),
      selectFillColor: new UserPreference('selection.defaultFillColor', null, 'visual', 'color'),
      selectStrokeColor: new UserPreference('selection.defaultStrokeColor', null, 'visual', 'color'),
      selectHighlightFillColor: new UserPreference('selection.highlightFillColor', null, 'visual', 'color'),
      selectHighlightStrokeColor: new UserPreference('selection.highlightStrokeColor', null, 'visual', 'color'),
      searchFillColor: new UserPreference('search.defaultFillColor', null, 'visual', 'color'),
      searchStrokeColor: new UserPreference('search.defaultStrokeColor', null, 'visual', 'color'),
      drawingFillColor: new UserPreference('drawing.defaultFillColor', null, 'visual', 'color'),
      drawingStrokeColor: new UserPreference('drawing.defaultStrokeColor', null, 'visual', 'color')
    };

    this.subscribe('themes.isLoaded', (_, isLoaded) => {
      if (isLoaded) {
        this.initPreferenceOptions();
        this.initCurrentPreferenceValues();
        this.initColorPicker();
        this.ready = true;
        this.render();
      }
    });
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
    if (!this.ready) {
      return;
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

    this.preferences.logLevel.options = [
      { label: 'debug', value: 'debug' },
      { label: 'info', value: 'info' },
      { label: 'warn', value: 'warn' },
      { label: 'error', value: 'error' }
    ];

    this.preferences.projection.options = Object.keys(this.configManager.Config.projections).map((key) => {
      return { label: this.configManager.Config.projections[key], value: key };
    });

    this.refreshThemeOptions();

    this.preferences.basemap.options = Object.keys(this.state.basemaps).map((key: string) => {
      const baseMapName = this.state.basemaps[Number(key)].name;
      return { label: baseMapName, value: baseMapName };
    });

    this.preferences.selectionComponent.options = [
      { label: 'window', value: 'window' },
      { label: 'grid', value: 'grid' }
    ];

    this.preferences.darkFrontendMode.options = [
      { label: 'same as system', value: undefined },
      { label: 'dark', value: true },
      { label: 'light', value: false }
    ];
  }

  /**
   * Collect all possible options for the default theme preference. This has to be repeatable, since the user
   * can create new custom themes at any time.
   */
  private refreshThemeOptions() {
    let defaultThemes: PreferenceOption[] = [{ label: '-', value: '' }];
    Object.keys(this.state.themes._allThemes).forEach((key: string) => {
      const themeName = this.state.themes._allThemes[Number(key)].name;
      defaultThemes.push({ label: themeName, value: themeName });
    });
    defaultThemes = defaultThemes.sort((a, b) => a.label.toUpperCase().localeCompare(b.label.toUpperCase()));
    const customThemes: PreferenceOption[] = this.customThemesManager.customThemes.map((ct: CustomTheme) => {
      return { label: ct.name, value: ct.name };
    });
    this.preferences.theme.options = [...defaultThemes, ...customThemes];
  }

  /**
   Readout the default value from the config to show in the component
   */
  private initCurrentPreferenceValues(): void {
    let result;
    for (const key in this.preferences) {
      result = getPropertyByPath(this.configManager.Config, this.preferences[key].configPath);
      if (result?.found && result.parentObject && result.lastKey) {
        this.preferences[key].currentValue = result.parentObject[result.lastKey];
      }
    }
  }

  /**
   * Create color picker object and set the initial color value
   */
  private initColorPicker(): void {
    super.render();
    for (const preferenceKey in this.preferences) {
      if (this.preferences[preferenceKey].uiElement === 'color') {
        const parent = this.shadowRoot?.getElementById(preferenceKey);
        if (parent) {
          const colorPicker = new GirafeColorPicker(
            {
              parent: parent,
              color: this.preferences[preferenceKey].currentValue as string,
              popup: 'top'
            },
            true
          );
          colorPicker.onChange = (color: Color) => (parent.style.backgroundColor = color.hex);
          colorPicker.onClose = (color: Color) => this.changePreference(preferenceKey, color.hex);
          colorPicker.setColor(this.preferences[preferenceKey].currentValue as string, false);
          this.colorPickers[preferenceKey] = colorPicker;
        }
      }
    }
  }

  /**
   * If necessary, change/update options of select elements right before they're shown.
   */
  onOpenSelectOption(preferenceKey: string): void {
    if (preferenceKey === 'theme') {
      this.refreshThemeOptions();
      this.refreshRender();
    }
  }

  /**
   Called when user changes a preference in the panel
   */
  onSelectOption(preferenceKey: string, evt: Event): void {
    const optionLabel = (evt.target as HTMLInputElement)?.value;
    const selectedOption = this.preferences[preferenceKey].options.find((o) => o.label === optionLabel);
    if (selectedOption) {
      this.changePreference(preferenceKey, selectedOption.value);
    }
  }

  /**
   Update state and local storage with new value
   */
  changePreference(preferenceKey: string, newValue: unknown): void {
    if (this.preferences[preferenceKey]) {
      this.preferences[preferenceKey].currentValue = newValue;
      this.updatePreferenceInConfig(preferenceKey);
      this.updatePreferenceInState(preferenceKey);
      this.updatePreferenceInStorage(preferenceKey);
      this.refreshRender();
    }
  }

  /**
   Update the config object with the new value
   */
  private updatePreferenceInConfig(preferenceKey: string): void {
    const preference = this.preferences[preferenceKey];
    setPropertyByPath(this.configManager.Config, preference.configPath, preference.currentValue);
  }

  /**
   Update the state with the new value
   */
  private updatePreferenceInState(preferenceKey: string): void {
    const preference = this.preferences[preferenceKey];
    if (preference?.statePath) {
      setPropertyByPath(this.state, preference.statePath, preference.getCurrentValueForState());
    }
  }

  /**
   Save the user preference as a partial config object in the local browser storage
   */
  private updatePreferenceInStorage(preferenceKey: string): void {
    const preference = this.preferences[preferenceKey];
    this.configManager.saveUserPreference(preference.configPath, preference.currentValue);
  }

  /**
   Delete user preference in the local browser storage
   */
  private deletePreferenceInStorage(preferenceKey: string): void {
    this.configManager.deleteUserPreference(this.preferences[preferenceKey].configPath);
  }

  /**
   * Reset user preferences back to defaults. This will delete the data in the local storage and set the current state
   * back to the defaults from config.json
   */
  public async onResetAll() {
    const confirm = await window.gConfirm('Reset user preferences back to default values?', 'Reset preferences');
    if (confirm) {
      this.resetAll();
    }
  }

  private resetAll() {
    for (const preferenceKey in this.preferences) {
      this.deletePreferenceInStorage(preferenceKey);
      this.preferences[preferenceKey].currentValue = this.configManager.getDefaultConfigValue(
        this.preferences[preferenceKey].configPath
      );
      this.updatePreferenceInState(preferenceKey);
      this.updatePreferenceInConfig(preferenceKey);
      this.colorPickers[preferenceKey]?.setColor(this.preferences[preferenceKey].currentValue as string, false);
    }
    this.render();
  }

  public getPreferencesByGroup(group: string): [UserPreference, string][] {
    return Object.keys(this.preferences)
      .map((key) => {
        return <[UserPreference, string]>[this.preferences[key], key];
      })
      .filter((p) => p[0].group === group);
  }
}
