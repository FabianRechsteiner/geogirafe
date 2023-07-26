import GirafeSingleton from "../base/GirafeSingleton";

export type GirafeConfig = {
  general?: {
    locale?: string;
  };
  languages?: {
    [key: string]: string;
  };
  themes?: {
    url?: string;
    defaultTheme?: string;
  };
  basemaps?: Object;
  treeview?: {
    useCheckboxes?: boolean;
    useLegendIcons?: boolean;
    hideLegendWhenLayerIsDeactivated?: boolean;
  };
  search?: {
    url?: string;
  };
  print?: {
    url?: string;
    defaultLayout?: string;
  };
  selection?: {
    defaultFillColor?: string;
    defaultStrokeColor?: string;
    defaultStrokeWidth?: number;
    defaultFocusFillColor?: string;
    defaultFocusStrokeColor?: string;
    defaultFocusStrokeWidth?: number;
  };
  redlining?: {
    defaultFillColor?: string;
    defaultStrokeColor?: string;
    defaultStrokeWidth?: number;
    defaultTextSize?: number;
    defaultFont?: string;
  };
  map?: {
    srid?: string;
    startZoom?: string;
    startPosition?: string;
    maxExtent?: string;
    scales?: number[];
    constraintScales?: boolean;
  };
  map3d?: {
    terrainUrl?: string;
    tilesetUrl?: string;
  };
};


class ConfigManager extends GirafeSingleton {

  static #config: GirafeConfig | null = null;
  static #locked = false;

  get Config() {
      return ConfigManager.#config;
  }

  // TODO REG: Use the same async schema for loadConfig (like loadTranslation)
  async loadConfig(): Promise<void> {
    return new Promise<void>(async(resolve) => {

      if (!ConfigManager.#locked) {
        ConfigManager.#locked = true;
        try {
          if (ConfigManager.#config === null) {
            // Load configuration
            console.log('Loading Application Configuration...')
            const response = await fetch('config.json');
            ConfigManager.#config = await response.json();
            console.log('Application Configuration loaded.')
            resolve();
          }
          else {
            resolve();
          }
        }
        finally {
          ConfigManager.#locked = false;
        }
      }
      else {
        setTimeout(() =>  {
          this.loadConfig().then(resolve);
        }, 100);
      }
    });
  }
}

export default ConfigManager
