class GirafeConfig {
  general: {
    locale: string;
  };
  languages: {
    translations: {
      [key: string]: string[];
    };
    defaultLanguage: string;
  };
  themes: {
    url: string;
    defaultTheme: string;
    imagesUrlPrefix: string;
    showErrorsOnStart: boolean;
  };
  basemaps: {
    show: boolean;
    defaultBasemap: string;
    OSM: boolean;
    SwissTopoVectorTiles: boolean;
    emptyBasemap: boolean;
  };
  treeview: {
    useCheckboxes: boolean;
    useLegendIcons: boolean;
    hideLegendWhenLayerIsDeactivated: boolean;
    defaultIconSize: {
      width: number;
      height: number;
    };
  };
  search: {
    url: string;
    objectPreview?: boolean;
    layerPreview?: boolean;
    minResolution?: number;
    defaultFillColor?: string;
    defaultStrokeColor?: string;
    defaultStrokeWidth?: number;
    paintSearchResults?: boolean;
  };
  print: {
    url: string;
    formats?: string[];
    defaultFormat?: string;
    layouts?: string[];
    defaultLayout?: string;
    scales?: number[];
    defaultScale?: number;
    attributeNames?: string[];
    printLegend?: {
      useBbox?: boolean;
      label?: Record<string, boolean | undefined>;
      params?: Record<string, Record<string, unknown>>;
      showGroupsTitle?: boolean;
    };
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
  share: {
    service: 'lstu' | 'gmf' | null;
    createUrl: string;
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
    constrainScales: boolean;
    constrainRotation: boolean;
    showScaleLine: boolean;
  };
  map3d?: {
    terrainImagery: {
      url: string;
      srid: 4326 | 3857;
      minLoD: number | undefined;
      maxLoD: number | undefined;
      coverageArea: number[] | undefined;
    };
    tilesetsMaxError: number | undefined;
    terrainUrl: string;
    tilesetsUrls: string[];
  };
  bookmarks?: {
    service: 'localStorage' | 'server';
    get: string | undefined;
    post: string | undefined;
  };
  lidar: {
    url: string;
  };
  csv: {
    encoding: string;
    extension: string;
    includeHeader: boolean;
    quote: string;
    separator: string;
  };

  public static readonly DEFAULT_LOCALE = 'en-US';

  /**
   * Creates the configuration of the app validating the json passed or giving default values.
   *
   * Every property of config that is not complying with GirafeConfig type is ignored.
   * @param config the configuration
   */
  constructor(config: GirafeConfig) {
    // Default values are documented here : https://doc.geomapfish.dev/docs/configuration
    // NOTE: Please adapt the documentation if necessary when doing changes here.
    this.general = this.initConfigGeneral(config);
    this.languages = this.initConfigLanguages(config);
    this.themes = this.initConfigThemes(config);
    this.basemaps = this.initConfigBasemaps(config);
    this.treeview = this.initConfigTreeview(config);
    this.selection = this.initConfigSelection(config);
    this.redlining = this.initConfigRedlining(config);
    this.projections = this.initConfigProjections(config);
    this.map = this.initConfigMap(config);
    this.bookmarks = this.initConfigBookmarks(config);
    this.lidar = this.initConfigLidar(config);
    this.csv = this.initConfigCsv(config);

    try {
      this.search = this.initConfigSearch(config);
    } catch (e) {
      // The application can be started even if the search is not correctly configured
      // We just display a warning in the console
      console.warn(e);
      this.search = {
        url: ''
      };
    }

    try {
      this.share = this.initConfigShare(config);
    } catch (e) {
      // The application can be started even if the search is not correctly configured
      // We just display a warning in the console
      console.warn(e);
      this.share = { service: null, createUrl: '' };
    }

    try {
      this.print = this.initConfigPrint(config);
    } catch (e) {
      // The application can be started even if the print is not correctly configured
      // We just display a warning in the console
      console.warn(e);
      this.print = { url: '' };
    }

    try {
      this.map3d = this.initConfigMap3D(config);
    } catch (e) {
      // The application can be started even if the 3D Part is not correctly configured
      // We just display a warning in the console
      console.warn(e);
    }
  }

  private initConfigProjections(config: GirafeConfig) {
    if (!config.projections) {
      throw new Error(`Configuration for projections is required. See https://doc.geomapfish.dev/docs/configuration`);
    }
    return config.projections;
  }

  private initConfigMap3D(config: GirafeConfig) {
    return config.map3d;
  }

  private initConfigMap(config: GirafeConfig) {
    // Map
    if (!config.map?.srid) {
      throw new Error(`Configuration for projections is required. See https://doc.geomapfish.dev/docs/configuration`);
    }
    if (!config.map?.scales) {
      throw new Error(`Configuration for projections is required. See https://doc.geomapfish.dev/docs/configuration`);
    }
    if (!config.map?.startPosition) {
      throw new Error(`Configuration for projections is required. See https://doc.geomapfish.dev/docs/configuration`);
    }
    if (!config.map?.startZoom) {
      throw new Error(`Configuration for projections is required. See https://doc.geomapfish.dev/docs/configuration`);
    }
    if (!config.map?.maxExtent) {
      throw new Error(`Configuration for projections is required. See https://doc.geomapfish.dev/docs/configuration`);
    }
    return {
      srid: config.map.srid,
      startZoom: config.map.startZoom,
      startPosition: config.map.startPosition,
      maxExtent: config.map.maxExtent,
      scales: config.map.scales,
      constrainScales: config.map?.constrainScales ?? true,
      constrainRotation: config.map?.constrainRotation ?? false,
      showScaleLine: config.map?.showScaleLine ?? true
    };
  }

  private initConfigRedlining(config: GirafeConfig) {
    return {
      defaultFillColor: config.redlining?.defaultFillColor ?? '#6666ff7f',
      defaultStrokeColor: config.redlining?.defaultStrokeColor ?? '#0000ff',
      defaultStrokeWidth: config.redlining?.defaultStrokeWidth ?? 2,
      defaultTextSize: config.redlining?.defaultTextSize ?? 12,
      defaultFont: config.redlining?.defaultFont ?? 'Arial'
    };
  }

  private initConfigShare(config: GirafeConfig) {
    if (!config.share?.createUrl) {
      throw new Error(
        `Configuration for share.createUrl is required. See https://doc.geomapfish.dev/docs/configuration`
      );
    }
    return {
      service: config.share?.service ?? 'gmf',
      createUrl: config.share?.createUrl
    };
  }

  private initConfigSelection(config: GirafeConfig) {
    return {
      defaultFillColor: config.selection?.defaultFillColor ?? '#ff66667f',
      defaultStrokeColor: config.selection?.defaultStrokeColor ?? '#ff3333',
      defaultStrokeWidth: config.selection?.defaultStrokeWidth ?? 4,
      defaultFocusFillColor: config.selection?.defaultFocusFillColor ?? '#ff33337f',
      defaultFocusStrokeColor: config.selection?.defaultFocusStrokeColor ?? '#ff0000',
      defaultFocusStrokeWidth: config.selection?.defaultFocusStrokeWidth ?? 4
    };
  }

  private initConfigPrint(config: GirafeConfig) {
    if (!config.print?.url) {
      throw new Error(`Configuration for print.url is required. See https://doc.geomapfish.dev/docs/configuration`);
    }
    if (!config.print?.attributeNames) {
      config.print.attributeNames = ['title', 'comments', 'legend'];
    }
    if (!config.print?.formats) {
      config.print.formats = ['pdf', 'png'];
    }
    return config.print;
  }

  private initConfigSearch(config: GirafeConfig) {
    if (!config.search?.url) {
      throw new Error(`Configuration for search.url is required. See https://doc.geomapfish.dev/docs/configuration`);
    }
    if (!config.search.url.includes('###SEARCHTERM###')) {
      throw new Error(`search.url is missing the expected pattern. See https://doc.geomapfish.dev/docs/configuration`);
    }
    return {
      url: config.search.url,
      objectPreview: config.search.objectPreview ?? false,
      layerPreview: config.search.layerPreview ?? false,
      minResolution: config.search.minResolution ?? 0.5,
      defaultFillColor: config.search?.defaultFillColor ?? '#3388ff7f',
      defaultStrokeColor: config.search?.defaultStrokeColor ?? '#3388ff',
      defaultStrokeWidth: config.search?.defaultStrokeWidth ?? 2,
      paintSearchResults: config.search?.paintSearchResults ?? true
    };
  }

  private initConfigTreeview(config: GirafeConfig) {
    return {
      useCheckboxes: config.treeview?.useCheckboxes ?? false,
      useLegendIcons: config.treeview?.useLegendIcons ?? false,
      hideLegendWhenLayerIsDeactivated: config.treeview?.hideLegendWhenLayerIsDeactivated ?? true,
      defaultIconSize: {
        height: config.treeview?.defaultIconSize?.height ?? 20,
        width: config.treeview?.defaultIconSize?.width ?? 20
      }
    };
  }

  private initConfigBasemaps(config: GirafeConfig) {
    return {
      show: config.basemaps?.show ?? true,
      defaultBasemap: config.basemaps?.defaultBasemap ?? 'Empty',
      OSM: config.basemaps?.OSM ?? false,
      SwissTopoVectorTiles: config.basemaps?.SwissTopoVectorTiles ?? false,
      emptyBasemap: config.basemaps?.emptyBasemap ?? true
    };
  }

  private initConfigLidar(config: GirafeConfig) {
    if (!config.lidar?.url) {
      console.warn('No Lidar URL');
    }
    return {
      url: config.lidar?.url ?? 'noLidarUrlInConfig'
    };
  }

  private initConfigCsv(config: GirafeConfig) {
    const defaultConfig = {
      encoding: 'utf-8',
      extension: '.csv',
      includeHeader: true,
      quote: "'",
      separator: ','
    };
    return {
      ...defaultConfig,
      ...config.csv
    };
  }

  private initConfigBookmarks(config: GirafeConfig) {
    if (config.bookmarks?.service) {
      if (config.bookmarks.service === 'server') {
        if (!config.bookmarks.get) {
          throw new Error(
            `Configuration for bookmarks.get is required. See https://doc.geomapfish.dev/docs/configuration`
          );
        }
        if (!config.bookmarks.post) {
          throw new Error(
            `Configuration for bookmarks.post is required. See https://doc.geomapfish.dev/docs/configuration`
          );
        }
      }
      return config.bookmarks;
    }
  }

  private initConfigThemes(config: GirafeConfig) {
    if (!config.themes?.url) {
      throw new Error(`Configuration for themes.url is required. See https://doc.geomapfish.dev/docs/configuration.`);
    }
    return {
      url: config.themes.url,
      defaultTheme: config.themes.defaultTheme ?? '',
      imagesUrlPrefix: config.themes.imagesUrlPrefix ?? '',
      showErrorsOnStart: config.themes.showErrorsOnStart ?? false
    };
  }

  private initConfigLanguages(config: GirafeConfig) {
    if (!config.languages) {
      throw new Error(`Configuration for languages is required. See https://doc.geomapfish.dev/docs/configuration.`);
    }
    return config.languages;
  }

  private initConfigGeneral(config: GirafeConfig) {
    return {
      locale: config.general.locale ?? GirafeConfig.DEFAULT_LOCALE
    };
  }
}

export default GirafeConfig;
