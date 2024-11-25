export type PreferenceOption = {
  label: string;
  value: string | number;
};

/**
 Contains info/config about preference items the user can change in the UserPreferenceComponent.
 */
export class UserPreference {
  currentValue: unknown = undefined;
  visible: boolean = true;
  statePath: string;
  configPath: string;
  private _options: PreferenceOption[] = [];

  constructor(statePath: string, configPath: string) {
    this.statePath = statePath;
    this.configPath = configPath;
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
}
