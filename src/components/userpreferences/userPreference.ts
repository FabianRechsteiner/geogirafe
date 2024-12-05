export type PreferenceOption = {
  label: string;
  value: unknown;
};

export const PreferenceGroups = ['system', 'map', 'visual'];
export type PreferenceGroup = (typeof PreferenceGroups)[number];

/**
 Contains info/config about preference items the user can change in the UserPreferenceComponent.
 */
export class UserPreference {
  currentValue: unknown = undefined;
  visible: boolean = true;
  configPath: string;
  statePath: string | null;
  group: PreferenceGroup;
  uiElement: 'select' | 'checkbox' | 'color';
  // The setting value in the config can have a different type as in the state, e.g. string vs object. In these cases,
  //  a mapping function is needed to get from the config value to the value in the state.
  private readonly _configToStateMapper: (valueInConfig: any) => any;
  private _options: PreferenceOption[] = [];

  constructor(
    configPath: string,
    statePath: string | null,
    group: PreferenceGroup,
    uiElement: 'select' | 'checkbox' | 'color',
    configToStateMapper?: (valueInConfig: any) => any
  ) {
    this.configPath = configPath;
    this.statePath = statePath;
    this.group = group;
    this.uiElement = uiElement;
    this._configToStateMapper = configToStateMapper || ((valueInConfig) => valueInConfig);
  }

  get options() {
    return this._options;
  }

  set options(options: PreferenceOption[]) {
    this._options = options;
    if (this._options.length === 0) {
      this.visible = false;
    }
  }

  getCurrentValueForState() {
    return this._configToStateMapper(this.currentValue);
  }
}
