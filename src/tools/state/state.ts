import MapPosition from './mapposition';
import type Feature from 'ol/Feature';
import type Basemap from '../../models/basemap';
import type Theme from '../../models/theme';
import type BaseLayer from '../../models/layers/baselayer';
import type ThemeLayer from '../../models/layers/themelayer';
import type OlGeomLineString from 'ol/geom/LineString';
import type ServerOgc from '../../models/serverogc';
import { TokenEndpointResponse, UserInfoResponse } from 'oauth4webapi';
import SelectionParam from '../../models/selectionparam';
import { GgUserInteractionListener } from './userInteractionManager';
import CustomTheme from '../../models/customtheme';

type GraphicalInterface = {
  helpVisible: boolean;
  drawingPanelVisible: boolean;
  printPanelVisible: boolean;
  lidarPanelVisible: boolean;
  crossSectionPanelVisible: boolean;
  sharePanelVisible: boolean;
  selectionComponentVisible: boolean;
  selectionComponent: string;
  layoutPanelVisible: boolean;
  aboutPanelVisible: boolean;
  userPreferencesPanelVisible: boolean;
  infoWindowVisible: boolean;
  darkMapMode: boolean;
  darkFrontendMode: boolean;
};

type Selection = {
  selectionParameters: SelectionParam[];
  selectedFeatures: Feature[];
  focusedFeatures: Feature[] | null;
  highlightedFeatures?: Feature[] | null;
  gridSelected: boolean;
};

type ThemesConfig = {
  _allThemes: Record<number, ThemeLayer>;
  isLoaded: boolean;
  lastSelectedTheme: ThemeLayer | CustomTheme | null;
};

type LayersConfig = {
  // TODO REG : This should probably be changes to type ThemeLayer[], but this need a refactoring of some depending classes and tests
  layersList: BaseLayer[];
};

type TreeviewConfig = {
  advanced: boolean;
  renderEnabled: boolean;
};

// Current Print state
type PrintConfig = {
  maskVisible: boolean;
  pageSize: [number, number] | null;
  format: string | null;
  scale: number | null;
  dpi: number | null;
};

// Current 3D-Globe state
type GlobeConfig = {
  display: '2D' | '3D' | '2D/3D';
  loaded: boolean;
  shadows: boolean;
  shadowsTimestamp: number;
};

export type InfoBoxContent = {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'error';
};

export type Lidar = {
  line: OlGeomLineString | null;
  drawActive: boolean;
};

/**
 * Login states :
 * 1. issuer.loggedIn   : Logged in to identity provider
 * 2. loggedIn          : Fully logged in (to both identity provider and backend)
 * 3. loginFailed       : Login failed
 * 4. backend.loggedOut : Logout from backend
 * 5. loggedOut         : Fully Logged out (from both identity provider and backend)
 * 5. logoutFailed      : Logout failed
 */
type LoginState = {
  status:
    | 'issuer.loggedIn'
    | 'loggedIn'
    | 'loginFailed'
    | 'backend.loggedOut'
    | 'loggedOut'
    | 'logoutFailed'
    | 'loggedOutForcedFromBackend';
  tokens?: TokenEndpointResponse;
  userInfo?: UserInfoResponse;
  audience: string[];
};

export type InfoWindow = {
  title: string | null;
  url: string | null;
  width: string | number | null;
  height: string | number | null;
  top: string | number | null;
  left: string | number | null;
};

export default class State {
  /**
   * This class is a used as the state of the application, which will be accessed behind a javascript proxy.
   * This means that each modification made to its properties must come from outside,
   * because they have to be made through the proxy, so that the modification can be listen.
   * Therefore, this class must not contain any method which is updating a value directly
   * For example, any method doing <this.xxx = value> is forbidden here, because the modification be known from the proxy
   */

  // All themes from themes.json
  // Dictionary where the key is the id of the theme
  themes: ThemesConfig = {
    _allThemes: {},
    isLoaded: false,
    lastSelectedTheme: null
  };

  // All basemaps from themes.json
  // Dictionary where the key is the id of the basemap
  basemaps: Record<number, Basemap> = {};

  // All OCG Servers from themes.json
  // Dictionary where the key is the name of the server
  ogcServers: Record<string, ServerOgc> = {};

  // Current active basemap
  activeBasemap: Basemap | null = null;

  // Current projection
  projection!: string;

  // Current mouse coordinates
  mouseCoordinates: number[] = [];

  // Interface configuration (visible panels, ...)
  interface: GraphicalInterface = {
    helpVisible: false,
    drawingPanelVisible: false,
    printPanelVisible: false,
    lidarPanelVisible: false,
    crossSectionPanelVisible: false,
    sharePanelVisible: false,
    selectionComponentVisible: false,
    selectionComponent: '',
    layoutPanelVisible: false,
    aboutPanelVisible: false,
    userPreferencesPanelVisible: false,
    infoWindowVisible: false,
    darkMapMode: false,
    darkFrontendMode: false
  };

  userInteractionListeners: GgUserInteractionListener[] = [];

  // Current language
  language: string | null = null;

  // LIDAR
  lidar: Lidar = {
    line: null,
    drawActive: false
  };

  // Is the application currently loading data ?
  loading = false;

  // Does a shared state exist and is it loaded? null = no shared state in URL
  sharedStateIsLoaded = false;

  // Current position configuration of the map
  position: MapPosition = new MapPosition();

  // Current layers configuration
  layers: LayersConfig = {
    layersList: []
  };

  // Current Treeview state
  treeview: TreeviewConfig = {
    advanced: false,
    renderEnabled: true
  };

  // Current Print state
  print: PrintConfig = {
    maskVisible: false,
    pageSize: null,
    format: null,
    scale: null,
    dpi: null
  };

  // Current 3D-Globe state
  globe: GlobeConfig = {
    // Possible values : ['3D, '2D/3D', '2D']
    display: '2D',
    loaded: false,
    shadows: false,
    shadowsTimestamp: new Date().valueOf()
  };

  // To manage selected and focused features
  selection: Selection = {
    selectionParameters: [],
    selectedFeatures: [],
    focusedFeatures: null,
    gridSelected: false
  };

  theme: Theme | null = null;

  infobox = {
    elements: [] as InfoBoxContent[]
  };

  infoWindow: InfoWindow = {
    title: null,
    url: null,
    width: null,
    height: null,
    top: null,
    left: null
  };

  // Indicates is the application is currently used in offline mode
  isOffline: boolean = false;

  oauth: LoginState = {
    status: 'loggedOut',
    audience: []
  };

  // The State object is defined as <not extensible> by the StateManager.
  // This property can be used by third-parts components or extensions
  // to add custom attributes to the state.
  extendedState: Record<string, object> = {};
}
