// SPDX-License-Identifier: Apache-2.0
class GirafeConfig {
  public general: {
    locale: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  public languages: {
    translations: {
      [key: string]: string[];
    };
    defaultLanguage: string;
  };
  public interface: {
    defaultSelectionComponent: string;
    darkFrontendMode: boolean | undefined;
    darkMapMode: boolean;
  };
  public themes: {
    url: string;
    defaultTheme: string;
    imagesUrlPrefix: string;
    showErrorsOnStart: boolean;
    selectionMode: 'add' | 'replace';
  };
  public basemaps: {
    show: boolean;
    defaultBasemap: string;
    OSM: boolean;
    SwissTopoVectorTiles: boolean;
    emptyBasemap: boolean;
    opacityBasemaps: string[];
  };
  public treeview: {
    hideLegendWhenLayerIsDeactivated: boolean;
    defaultIconSize: {
      width: number;
      height: number;
    };
  };
  public search: {
    url: string;
    resultsSrid: string;
    objectPreview?: boolean;
    layerPreview?: boolean;
    minResolution?: number;
    defaultFillColor?: string;
    defaultStrokeColor?: string;
    defaultStrokeWidth?: number;
    paintSearchResults?: boolean;
  };
  public print?: {
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
    customScale?: boolean;
  };
  public selection: {
    maxFeature: number;
    defaultFillColor: string;
    defaultStrokeColor: string;
    defaultStrokeWidth: number;
    highlightFillColor: string;
    highlightStrokeColor: string;
  };
  public drawing: {
    defaultFillColor: string;
    defaultStrokeColor: string;
    defaultStrokeWidth: number;
    defaultTextSize: number;
    defaultFont: string;
    defaultVertexRadius: number;
    defaultVertexFillColor: string;
    defaultVertexStrokeWidth: number;
  };
  public share?: {
    service: 'gmf' | 'geogirafe' | null;
    preferNames: boolean;
    createUrl: string;
    getUrl?: string;
  };
  public projections: {
    [key: string]: string;
  };
  public map: {
    srid: string;
    startZoom: string;
    startPosition: string;
    maxExtent?: string;
    scales: number[];
    constrainScales: boolean;
    constrainRotation: boolean;
    showScaleLine: boolean;
  };
  public map3d?: {
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
    maximumZoomDistance: number;
  };
  public lidar?: {
    url: string;
  };
  public news?: {
    urls: string[];
    autoDisplay: boolean;
  };
  public externalLayers?: {
    predefinedSources: {
      label: string;
      type: 'WMS' | 'WMTS';
      url: string;
    }[];
  };
  public contextmenu: {
    crs: {
      code: string;
      translation: string;
      format: 'decimal' | 'dms';
      precision: number;
    }[];
    sources: {
      id: string;
      translation: string;
      prefix: string;
      suffix: string;
      precision: number;
      crs: string;
      nodata: number;
      url: string;
      loading: boolean;
    }[];
    links: {
      translation: string;
      crs: string;
      url: string;
    }[];
  };
  public crs: { code: string; definition: string }[];
  public csv: {
    encoding: string;
    extension: string;
    includeHeader: boolean;
    quote: string;
    separator: string;
  };
  public metadata: {
    metadataUrlPrefix: string;
  };
  public infoWindow: {
    defaultWindowWidth: string;
    defaultWindowHeight: string;
    defaultWindowPositionTop: string;
    defaultWindowPositionLeft: string;
  };
  public offline?: {
    downloadStartZoom: number;
    downloadEndZoom: number;
  };
  public query: {
    legacy: boolean;
  };
  public gmfauth?: {
    url: string;
    loginRequired: boolean;
    checkSessionOnLoad: boolean;
    audience: string[];
    authMode: 'cookie';
    refererPolicy: ReferrerPolicy;
    audienceExcludedPaths: string[];
  };
  public oauth?: {
    issuer: {
      url: string;
      algorithm: 'oauth2' | 'oidc';
      codeChallengeMethod: string;
      clientId: string;
      scope: string;
      loginRequired: boolean;
      checkSessionOnLoad: boolean;
      audience: string[];
      audienceExcludedPaths: string[];
    };
    geomapfish: {
      userInfoUrl: string;
      loginUrl: string;
      logoutUrl: string;
      anonymousUsername: string;
      authMode: 'token' | 'cookie';
      refererPolicy: ReferrerPolicy;
    };
  };
  public userdata: {
    source: 'localStorage' | 'server';
    getUrl: string | undefined;
    postUrl: string | undefined;
  };
  public contact?: {
    url: string;
    reasons: string[];
    email: string;
  };
  public onboarding?: {
    steps: {
      component?: string;
      element: string;
      title: string;
      description: string;
    }[];
  };
  public api?: {
    demo: {
      center: string;
      zoom: string;
      basemap: string;
      crosshair: string;
      tooltip: string;
      layers: string;
      multiLayers: string;
      layersWithConfig: string;
      layersWithConfigCenter: string;
    };
  };

  // The extended configuration can be used by third-party components or extensions
  // to add custom attributes to the GirafeConfig.
  public extendedConfig?: Record<string, object>;

  public static readonly DEFAULT_LOCALE = 'en-US';

  /**
   * Creates the configuration of the app validating the json passed or giving default values.
   *
   * Every property of config that is not complying with GirafeConfig type is ignored.
   * @param config the configuration
   */
  public constructor(config: GirafeConfig) {
    // Default values are documented here : https://doc.geomapfish.dev/docs/configuration
    // NOTE: Please adapt the documentation if necessary when doing changes here.
    this.general = this.initConfigGeneral(config);
    this.languages = this.initConfigLanguages(config);
    this.interface = this.initConfigInterface(config);
    this.themes = this.initConfigThemes(config);
    this.basemaps = this.initConfigBasemaps(config);
    this.treeview = this.initConfigTreeview(config);
    this.selection = this.initConfigSelection(config);
    this.drawing = this.initConfigDrawing(config);
    this.projections = this.initConfigProjections(config);
    this.map = this.initConfigMap(config);
    this.news = this.initConfigNews(config);
    this.lidar = this.initConfigLidar(config);
    this.csv = this.initConfigCsv(config);
    this.metadata = this.initConfigMetadata(config);
    this.infoWindow = this.initConfigInfoWindow(config);
    this.offline = this.initConfigOffline(config);
    this.query = this.initConfigQuery(config);
    this.oauth = this.initConfigOauth(config);
    this.gmfauth = this.initGmfOauth(config);
    this.userdata = this.initUserData(config);
    this.externalLayers = this.initExternalLayers(config);
    this.contextmenu = this.initContextMenu(config);
    this.crs = this.initCRS(config);
    this.contact = this.initConfigContact(config);
    this.extendedConfig = this.initExtendedConfig(config);
    this.onboarding = this.initOnboarding(config);
    this.api = this.initApiConfig(config);

    try {
      this.search = this.initConfigSearch(config);
    } catch (e) {
      // The application can be started even if the search is not correctly configured
      // We just display a warning in the console
      console.warn(e);
      this.search = {
        url: '',
        resultsSrid: config.map.srid
      };
    }

    try {
      this.share = this.initConfigShare(config);
    } catch (e) {
      // The application can be started even if the search is not correctly configured
      // We just display a warning in the console
      console.warn(e);
    }

    try {
      this.print = this.initConfigPrint(config);
    } catch (e) {
      // The application can be started even if the print is not correctly configured
      // We just display a warning in the console
      console.warn(e);
    }

    try {
      this.map3d = this.initConfigMap3D(config);
    } catch (e) {
      // The application can be started even if the 3D Part is not correctly configured
      // We just display a warning in the console
      console.warn(e);
    }

    try {
      this.news = this.initConfigNews(config);
    } catch (e) {
      // The application can be started even if the news is not correctly configured
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

  private initConfigQuery(config: GirafeConfig) {
    return {
      legacy: config.query?.legacy ?? false
    };
  }

  private initConfigDrawing(config: GirafeConfig) {
    return {
      defaultFillColor: config.drawing?.defaultFillColor ?? '#6666ff7f',
      defaultStrokeColor: config.drawing?.defaultStrokeColor ?? '#0000ff',
      defaultStrokeWidth: config.drawing?.defaultStrokeWidth ?? 2,
      defaultTextSize: config.drawing?.defaultTextSize ?? 12,
      defaultFont: config.drawing?.defaultFont ?? 'Arial',
      defaultVertexRadius: config.drawing?.defaultVertexRadius ?? 8,
      defaultVertexFillColor: config.drawing?.defaultVertexFillColor ?? '#ffffffbf',
      defaultVertexStrokeWidth: config.drawing?.defaultVertexStrokeWidth ?? 2
    };
  }

  private initConfigShare(config: GirafeConfig) {
    if (!config.share?.createUrl) {
      throw new Error(
        `Configuration for share.createUrl is required. See https://doc.geomapfish.dev/docs/configuration`
      );
    }
    if (config.share?.service === 'geogirafe' && !config.share?.getUrl) {
      throw new Error(
        `Configuration for share.getUrl is required if service type is 'geogirafe'. See https://doc.geomapfish.dev/docs/configuration`
      );
    }
    return {
      service: config.share?.service ?? 'gmf',
      preferNames: config.share?.preferNames ?? false,
      createUrl: config.share?.createUrl,
      getUrl: config.share?.getUrl
    };
  }

  private initConfigSelection(config: GirafeConfig) {
    return {
      maxFeature: config.selection?.maxFeature ?? 300,
      defaultFillColor: config.selection?.defaultFillColor ?? '#ff66667f',
      defaultStrokeColor: config.selection?.defaultStrokeColor ?? '#ff3333',
      defaultStrokeWidth: config.selection?.defaultStrokeWidth ?? 4,
      highlightFillColor: config.selection?.highlightFillColor ?? '#00ff227f',
      highlightStrokeColor: config.selection?.highlightStrokeColor ?? '#00ff22'
    };
  }

  private initConfigPrint(config: GirafeConfig) {
    if (!config.print?.url) {
      throw new Error(`Configuration for print.url is required. See https://doc.geomapfish.dev/docs/configuration`);
    }

    config.print.attributeNames ??= ['title', 'comments', 'legend'];
    config.print.formats ??= ['pdf', 'png'];
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
      resultsSrid: config.search.resultsSrid ?? config.map.srid,
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
      emptyBasemap: config.basemaps?.emptyBasemap ?? true,
      opacityBasemaps: config.basemaps?.opacityBasemaps ?? ([] as string[])
    };
  }

  private initConfigLidar(config: GirafeConfig) {
    return config.lidar;
  }

  private initConfigNews(config: GirafeConfig) {
    return config.news;
  }

  private initConfigCsv(config: GirafeConfig) {
    const defaultConfig = {
      encoding: 'utf-8',
      extension: '.csv',
      includeHeader: true,
      quote: "'",
      separator: ';' /* Switched to ';' as ',' wasn't working with MS Excel out of the Box (double-click on the file) while for example LibreOffice works with both*/
    };
    return {
      ...defaultConfig,
      ...config.csv
    };
  }

  private initConfigMetadata(config: GirafeConfig) {
    const defaultConfig = {
      metadataUrlPrefix: ''
    };
    return {
      ...defaultConfig,
      ...config.metadata
    };
  }

  private initConfigInfoWindow(config: GirafeConfig) {
    const defaultConfig = {
      defaultWindowWidth: '960px',
      defaultWindowHeight: '460px',
      defaultWindowPositionTop: '1rem',
      defaultWindowPositionLeft: '370px'
    };
    return {
      ...defaultConfig,
      ...config.infoWindow
    };
  }

  private initConfigContact(config: GirafeConfig) {
    return config.contact;
  }

  private initConfigOffline(config: GirafeConfig) {
    // This can be null, that's not a problem. No default value either.
    return config.offline;
  }

  private initConfigThemes(config: GirafeConfig) {
    if (!config.themes?.url) {
      throw new Error(`Configuration for themes.url is required. See https://doc.geomapfish.dev/docs/configuration.`);
    }
    return {
      url: config.themes.url,
      defaultTheme: config.themes.defaultTheme ?? '',
      imagesUrlPrefix: config.themes.imagesUrlPrefix ?? '',
      showErrorsOnStart: config.themes.showErrorsOnStart ?? false,
      selectionMode: config.themes.selectionMode ?? 'replace'
    };
  }

  private initConfigLanguages(config: GirafeConfig) {
    if (!config.languages) {
      throw new Error(`Configuration for languages is required. See https://doc.geomapfish.dev/docs/configuration.`);
    }
    return config.languages;
  }

  private initConfigInterface(config: GirafeConfig) {
    const defaultConfig = {
      defaultSelectionComponent: 'window',
      darkFrontendMode: undefined,
      darkMapMode: false
    };
    return {
      ...defaultConfig,
      ...config.interface
    };
  }

  private initConfigGeneral(config: GirafeConfig) {
    return {
      locale: config.general.locale ?? GirafeConfig.DEFAULT_LOCALE,
      // NOTE REG: Small hack specific to Vite: When running in debug mode, we force the logLevel to debug.
      // Otherwise we will always have to manually activate it.
      logLevel: import.meta?.env?.DEV ? 'debug' : (config.general.logLevel ?? 'warn')
    };
  }

  private initGmfOauth(config: GirafeConfig) {
    if (!config.gmfauth) {
      // No GMF-Auth configuration
      return undefined;
    }

    if (!config.gmfauth.url) {
      throw new Error(`Configuration for gmfauth.url is required. See https://doc.geomapfish.dev/docs/configuration.`);
    }

    let gmfauthUrl = config.gmfauth.url;
    if (!config.gmfauth.url.endsWith('/')) {
      gmfauthUrl = `${config.gmfauth.url}/`;
    }

    if (!config.gmfauth.audience) {
      throw new Error(
        `Configuration for gmfauth.audience is required. See https://doc.geomapfish.dev/docs/configuration.`
      );
    }

    return {
      url: gmfauthUrl,
      audience: config.gmfauth.audience,
      loginRequired: config.gmfauth.loginRequired ?? false,
      checkSessionOnLoad: config.gmfauth.checkSessionOnLoad ?? true,
      authMode: 'cookie' as const,
      refererPolicy: config.gmfauth.refererPolicy ?? 'strict-origin-when-cross-origin',
      audienceExcludedPaths: config.gmfauth.audienceExcludedPaths ?? []
    };
  }

  private initConfigOauth(config: GirafeConfig) {
    if (!config.oauth) {
      // No oAuth configuration
      return undefined;
    }

    if (!config.oauth.issuer.url) {
      throw new Error(
        `Configuration for oauth.issuer.url is required. See https://doc.geomapfish.dev/docs/configuration.`
      );
    }
    if (!config.oauth.issuer.clientId) {
      throw new Error(
        `Configuration for oauth.issuer.clientId is required. See https://doc.geomapfish.dev/docs/configuration.`
      );
    }
    if (!config.oauth.issuer.audience) {
      throw new Error(
        `Configuration for oauth.issuer.audience is required. See https://doc.geomapfish.dev/docs/configuration.`
      );
    }
    if (!config.oauth.geomapfish.userInfoUrl) {
      throw new Error(
        `Configuration for oauth.geomapfish.userInfoUrl is required. See https://doc.geomapfish.dev/docs/configuration.`
      );
    }

    const issuerConfig = {
      url: config.oauth.issuer.url,
      algorithm: config.oauth.issuer.algorithm ?? 'oidc',
      codeChallengeMethod: config.oauth.issuer.codeChallengeMethod ?? 'S256',
      clientId: config.oauth.issuer.clientId,
      scope: config.oauth.issuer.scope ?? 'openid',
      loginRequired: config.oauth.issuer.loginRequired ?? false,
      checkSessionOnLoad: config.oauth.issuer.checkSessionOnLoad ?? false,
      audience: config.oauth.issuer.audience,
      audienceExcludedPaths: config.oauth.issuer.audienceExcludedPaths ?? []
    };

    const geomapfishConfig = {
      userInfoUrl: config.oauth.geomapfish.userInfoUrl,
      loginUrl: config.oauth.geomapfish.loginUrl,
      logoutUrl: config.oauth.geomapfish.logoutUrl,
      anonymousUsername: config.oauth.geomapfish.anonymousUsername,
      authMode: config.oauth.geomapfish.authMode ?? 'cookie',
      refererPolicy: config.oauth.geomapfish.refererPolicy ?? 'strict-origin-when-cross-origin'
    };

    return {
      issuer: issuerConfig,
      geomapfish: geomapfishConfig
    };
  }

  private initUserData(config: GirafeConfig) {
    const defaultConfig = {
      source: 'localStorage'
    };
    return {
      ...defaultConfig,
      ...config.userdata
    };
  }

  private initContextMenu(config: GirafeConfig) {
    const contextMenuConfig = {
      crs: config.contextmenu?.crs ?? [
        { code: 'EPSG:4326', translation: 'EPSG:4326', format: 'decimal', precision: 7 },
        { code: 'EPSG:4326', translation: 'EPSG:4326-DMS', format: 'dms', precision: 2 }
      ],
      sources: config.contextmenu?.sources ?? [],
      links: config.contextmenu?.links ?? []
    };
    return contextMenuConfig;
  }

  private initCRS(config: GirafeConfig) {
    return config.crs;
  }

  private initExternalLayers(config: GirafeConfig) {
    return config.externalLayers ?? undefined;
  }

  private initExtendedConfig(config: GirafeConfig) {
    return config.extendedConfig ?? undefined;
  }

  private initOnboarding(config: GirafeConfig) {
    return config.onboarding ?? undefined;
  }

  private initApiConfig(config: GirafeConfig) {
    return config.api ?? undefined;
  }
}

export default GirafeConfig;
