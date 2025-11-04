import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { PreferenceGroup, PreferenceGroups, PreferenceOption, UserPreference } from './userPreference';
import CustomTheme from '../../models/customtheme';
import { getPropertyByPath, setPropertyByPath } from '../../tools/utils/pathUtils';
import { Color } from 'vanilla-picker';
import GirafeColorPicker from '../../tools/utils/girafecolorpicker';
import { systemIsInDarkMode } from '../../tools/utils/utils';

/**
 Lets the user override default configuration values and saves them as user data.
 */
export default class UserPreferencesComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  visible = false;
  ready: boolean = false;
  preferences!: Record<string, UserPreference>;
  preferenceGroups: PreferenceGroup[] = PreferenceGroups;
  colorPickers: Record<string, GirafeColorPicker> = {};

  private readonly storagePath = 'configOverrides';

  constructor() {
    super('user-preferences');
  }

  private initPreferences() {
    // Define all settings that the user can change
    this.preferences = {
      language: new UserPreference('languages.defaultLanguage', 'language', 'system', 'select'),
      logLevel: new UserPreference('general.logLevel', null, 'system', 'select'),
      theme: new UserPreference('themes.defaultTheme', 'theme', 'map', 'select', (themeName: string) => {
        const themeId = Object.keys(this.state.themes._allThemes).find(
          (themeKey) => this.state.themes._allThemes[Number(themeKey)].name === themeName
        );
        return this.state.themes._allThemes[Number(themeId)];
      }),
      basemaps: new UserPreference('basemaps.defaultBasemap', 'activeBasemaps', 'map', 'select', (bsName: string) => {
        const bsId = Object.keys(this.state.basemaps).find(
          (bsKey) => this.state.basemaps[Number(bsKey)].name === bsName
        );
        return [this.state.basemaps[Number(bsId)]];
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
        this.initDarkModeDefaults();
        this.initColorPicker();
        this.ready = true;
        this.render();
      }
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.initPreferences();
    this.render();
    this.subscribe('interface.userPreferencesPanelVisible', (_, newValue) => this.togglePanel(newValue));
    this.subscribe('interface.darkFrontendMode', (_, newValue) => this.onChangeDarkFrontendMode(newValue));
    this.subscribe('interface.darkMapMode', (_, newValue) => this.onChangeDarkMapMode(newValue));
  }

  render(): void {
    if (this.visible) {
      this.renderComponent();
    } else {
      this.hide();
    }
  }

  private renderComponent(): void {
    if (!this.ready) {
      return;
    }
    super.render();
    super.girafeTranslate();
  }

  private togglePanel(visible: boolean): void {
    this.visible = visible;
    this.render();
  }

  onChangeDarkMapMode(newValue: boolean | undefined) {
    const currentTheme = newValue ? 'dark' : 'light';
    this.activateTheme(currentTheme, 'map');
  }

  onChangeDarkFrontendMode(newValue: boolean | undefined) {
    const themeIsDark = newValue ?? systemIsInDarkMode();
    const currentTheme = themeIsDark ? 'dark' : 'light';
    this.activateTheme(currentTheme, 'theme');
  }

  activateTheme(mode: 'dark' | 'light', className: string) {
    const otherMode = mode === 'dark' ? 'light' : 'dark';
    document.body.classList.remove(`${otherMode}-${className}`);
    document.body.classList.add(`${mode}-${className}`);
  }

  /**
   For preferences that have options to choose from, readout all possible select options to show in the dropdowns
   */
  private initPreferenceOptions(): void {
    this.preferences.language.options = Object.keys(this.context.configManager.Config.languages.translations).map(
      (key) => {
        return { label: key, value: key };
      }
    );

    this.preferences.logLevel.options = [
      { label: 'debug', value: 'debug' },
      { label: 'info', value: 'info' },
      { label: 'warn', value: 'warn' },
      { label: 'error', value: 'error' }
    ];

    this.preferences.projection.options = Object.keys(this.context.configManager.Config.projections).map((key) => {
      return { label: this.context.configManager.Config.projections[key], value: key };
    });

    this.refreshThemeOptions();

    this.preferences.basemaps.options = Object.keys(this.state.basemaps).map((key: string) => {
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
    const customThemes: PreferenceOption[] = this.context.customThemesManager.customThemes.map((ct: CustomTheme) => {
      return { label: ct.name, value: ct.name };
    });
    this.preferences.theme.options = [...defaultThemes, ...customThemes];
  }

  /**
   Readout the default value from the config to show in the component
   */
  private initCurrentPreferenceValues(): void {
    for (const key in this.preferences) {
      const { found, parentObject, lastKey } = getPropertyByPath(
        this.context.configManager.Config,
        this.preferences[key].configPath
      );
      this.preferences[key].currentValue = found && parentObject && lastKey ? parentObject[lastKey] : undefined;
    }
  }

  /**
   * Initializes dark mode-related preferences with fallback logic
   */
  private initDarkModeDefaults() {
    const config = this.context.configManager.Config.interface.darkFrontendMode;
    this.state.interface.darkFrontendMode = config ?? systemIsInDarkMode();
    this.state.interface.darkMapMode = this.context.configManager.Config.interface.darkMapMode;
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
    setPropertyByPath(this.context.configManager.Config, preference.configPath, preference.currentValue);
  }

  /**
   Update the state with the new value
   */
  private updatePreferenceInState(preferenceKey: string): void {
    const preference = this.preferences[preferenceKey];
    if (preference.statePath) {
      setPropertyByPath(this.state, preference.statePath, preference.getCurrentValueForState());
    }
  }

  /**
   Save the user preference as a config override in user data storage
   */
  private updatePreferenceInStorage(preferenceKey: string): void {
    const preference = this.preferences[preferenceKey];
    // Values are saved under 'configOverrides' in the same structure as in the config
    this.context.userDataManager.saveUserData(`${this.storagePath}.${preference.configPath}`, preference.currentValue);
  }

  /**
   Delete user preference in the local browser storage
   */
  private deletePreferenceInStorage(preferenceKey: string): void {
    this.context.userDataManager.deleteUserData(`${this.storagePath}.${this.preferences[preferenceKey].configPath}`);
  }

  /**
   * Reset user preferences back to defaults. This will delete the configOverrides object in storage and set the
   * current state back to the defaults from config.json
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
      this.preferences[preferenceKey].currentValue = this.context.configManager.getDefaultConfigValue(
        this.preferences[preferenceKey].configPath
      );
      this.updatePreferenceInState(preferenceKey);
      this.updatePreferenceInConfig(preferenceKey);
      this.colorPickers[preferenceKey]?.setColor(this.preferences[preferenceKey].currentValue as string, false);
    }
    this.render();
  }

  /**
   * @returns all preferences of a group for easy usage in the template.
   */
  public getPreferencesByGroup(group: string): [UserPreference, string][] {
    return Object.keys(this.preferences)
      .map((key) => {
        return <[UserPreference, string]>[this.preferences[key], key];
      })
      .filter((p) => p[0].group === group);
  }
}
