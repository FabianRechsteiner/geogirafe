import GirafeSingleton from "../base/GirafeSingleton";

class GirafeConfig {
  general: {
    locale: string;
  };
  languages: {
    [key: string]: string;
  };
  themes: {
    url: string;
    defaultTheme: string;
    imagesUrlPrefix: string;
  };
  basemaps: {
    show: boolean;
    defaultBasemap: string;
    OSM: boolean;
    SwissTopoVectorTiles: boolean;
  };
  treeview: {
    useCheckboxes: boolean;
    useLegendIcons: boolean;
    hideLegendWhenLayerIsDeactivated: boolean;
    defaultIconSize: {
      width: number,
      height: number
    }
  };
  search: {
    url: string;
  };
  print: {
    url: string;
    defaultLayout: string;
  };
  selection: {
    defaultFillColor: string;
    defaultStrokeColor: string;
    defaultStrokeWidth: number;
    defaultFocusFillColor: string;
    defaultFocusStrokeColor: string;
    defaultFocusStrokeWidth: number;
  };
  redlining: {
    defaultFillColor: string;
    defaultStrokeColor: string;
    defaultStrokeWidth: number;
    defaultTextSize: number;
    defaultFont: string;
  };
  projections: {
    [key: string]: string;
  };
  map: {
    srid: string;
    startZoom: string;
    startPosition: string;
    maxExtent: string;
    scales: number[];
    constraintScales: boolean;
  };
  map3d?: {
    terrainUrl: string;
    tilesetUrl: string;
  };

  /**
   * Creates the configuration of the app validating the json passed or giving default values.
   *
   * Every property of config that is not complying with GirafeConfig type is ignored.
   * @param config the configuration
   */
  constructor(config: GirafeConfig) {
    if (!config.general || !config.general.locale) {
      throw new Error(`general.locale is required`);
    }
    this.general = {
      locale: config.general.locale
    };

    if (!config.languages) {
      throw new Error(`languages is required`);
    }
    this.languages = config.languages;

    if (!config.themes || !config.themes.url) {
      throw new Error(`themes.url is required`)
    }
    this.themes = {
      url: config.themes.url,
      defaultTheme: config.themes.defaultTheme,
      imagesUrlPrefix: config.themes.imagesUrlPrefix ?? ''
    };

    if (!config.basemaps || !config.basemaps.defaultBasemap) {
      throw new Error(`basemaps.defaultBasemap is required`)
    }
    this.basemaps = {
      show: config.basemaps.show ?? true,
      defaultBasemap: config.basemaps.defaultBasemap,
      OSM: config.basemaps.OSM ?? false,
      SwissTopoVectorTiles: config.basemaps.SwissTopoVectorTiles ?? false
    }

    this.treeview = {
      useCheckboxes: config.treeview.useCheckboxes ?? false,
      useLegendIcons: config.treeview.useLegendIcons ?? false,
      hideLegendWhenLayerIsDeactivated: config.treeview.hideLegendWhenLayerIsDeactivated ?? false,
      defaultIconSize: {
        height: config.treeview.defaultIconSize.height ?? 20,
        width: config.treeview.defaultIconSize.width ?? 20
      }
    };

    if (!config.search) {
      throw new Error(`search is required`)
    }
    this.search = config.search;

    try {
      if (config.print.url.length === 0) {
        console.warn('Your print.url is not configured, print will not work');
      }
      if (config.print.defaultLayout.length === 0) {
        console.warn('Your print.defaultLayout is not configured, print will not work');
      }
    } catch (e) {
      console.warn(`print.url and print.defaultLayout are required`)
    }
    this.print = config.print;

    if (!config.selection) {
      config.selection = {
        defaultFillColor: "#ff66667f",
        defaultStrokeColor: "#ff3333",
        defaultStrokeWidth: 4,
        defaultFocusFillColor: "#ff33337f",
        defaultFocusStrokeColor: "#ff0000",
        defaultFocusStrokeWidth: 4
      };
    }
    this.selection = config.selection;

    if (!config.redlining) {
      config.redlining = {
        defaultFillColor: "#6666ff7f",
        defaultStrokeColor: "#0000ff",
        defaultStrokeWidth: 2,
        defaultTextSize: 12,
        defaultFont: "Arial"
      }
    }
    this.redlining = config.redlining;

    if (!config.projections) {
      throw new Error(`projections is required`);
    }
    this.projections = config.projections;

    if (!config.map.srid) {
      throw new Error(`map.srid is required`);
    }
    if (!config.map.scales) {
      throw new Error(`map.scales is required`);
    }
    if (!config.map.startZoom) {
      config.map.startZoom = "4";
    }
    if (!config.map.maxExtent) {
      throw new Error(`map.maxExtent is required`);
    }
    if (!config.map.constraintScales) {
      config.map.constraintScales = false;
    }
    this.map = config.map;

    this.map3d = config.map3d;
  }
};


class ConfigManager extends GirafeSingleton {

  static #config: GirafeConfig;
  static #locked = false;

  get Config() {
    return ConfigManager.#config;
  }

  // TODO REG: Use the same async schema for loadConfig (like loadTranslation)
  async loadConfig(): Promise<void> {
    if (!ConfigManager.#locked) {
      ConfigManager.#locked = true;
      try {
        if (!ConfigManager.#config) {
          // Load configuration
          console.log('Loading Application Configuration...')
          const response = await fetch('config.json');
          const jsonConfig = await response.json();
          const configInstance = new GirafeConfig(jsonConfig);
          ConfigManager.#config = configInstance;
          console.log('Application Configuration loaded.');
        }
      } catch (error) {
        console.error('Error loading application configuration:', error);
      } finally {
        ConfigManager.#locked = false;
      }
    }
    else {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      await this.loadConfig();
    }
  }
}

export default ConfigManager
