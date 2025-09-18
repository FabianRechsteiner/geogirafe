import MapPosition from './mapposition';
import type Basemap from '../../models/basemaps/basemap';
import type ThemeLayer from '../../models/layers/themelayer';
import type OlGeomLineString from 'ol/geom/LineString';
import type ServerOgc from '../../models/serverogc';
import { BrainSerialize } from './brain/decorators';
import BasemapEmpty from '../../models/basemaps/basemapempty';
import LayersConfig from './layersConfig';
import type { TokenEndpointResponse } from 'oauth4webapi';
import type { GgUserInteractionListener } from './userInteractionManager';
import type CustomTheme from '../../models/customtheme';
import { systemIsInDarkMode } from '../utils/utils';
import ObjectSelection from './objectselection';
import type Theme from '../../models/theme';

type GraphicalInterface = {
  isMobile: boolean;
  helpVisible: boolean;
  drawingPanelVisible: boolean;
  printPanelVisible: boolean;
  extLayerPanelVisible: boolean;
  lidarPanelVisible: boolean;
  crossSectionPanelVisible: boolean;
  editPanelVisible: boolean;
  sharePanelVisible: boolean;
  selectionComponentVisible: boolean;
  selectionComponent: string;
  layoutPanelVisible: boolean;
  aboutPanelVisible: boolean;
  userPreferencesPanelVisible: boolean;
  contactPanelVisible: boolean;
  infoWindowVisible: boolean;
  darkMapMode: boolean;
  darkFrontendMode: boolean;
  swipeupPanelMode: SwipeupPanelMode;
  swipeupPanelContent: 'selector' | 'features' | 'menu' | null;
};

export type ThemesConfig = {
  _allThemes: Record<number, ThemeLayer>;
  isLoaded: boolean;
  lastSelectedTheme: ThemeLayer | CustomTheme | null;
};

type TreeviewConfig = {
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
export type CameraConfig = {
  heading: number;
  pitch: number;
  roll: number;
};

type GlobeConfig = {
  display: '2D' | '3D' | '2D/3D';
  loaded: boolean;
  shadows: boolean;
  shadowsTimestamp: number;
  camera: CameraConfig | null;
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

type Functionalities = {
  authorized_plugins?: string[];
};

type UserInfo = {
  username: string;
  display_name: string;
  email: string;
  family_name: string;
  given_name: string;
  is_intranet: boolean;
  two_factor_enable: boolean;
  roles: unknown[];
  functionalities?: Functionalities;
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
  userInfo?: UserInfo;
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

export type ExtendedState = Record<string, object>;

/**
 * The pannel can be:
 * - "closed": it is invisible, below screen
 * - "reduced": only a small tray is visible at the bottom of the screen
 * - "half": about half of the screen
 * - "full": the pannel is fully open, covering up to almost the top of the screen
 * - "manual": a state reserved for when the panel handle was used to manually adjust the panel height
 */
export type SwipeupPanelMode = 'closed' | 'reduced' | 'half' | 'full' | 'manual';

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
  @BrainSerialize
  activeBasemap: Basemap = new BasemapEmpty();

  // Current projection
  @BrainSerialize
  projection!: string;

  // Current mouse coordinates
  mouseCoordinates: number[] = [];

  // Interface configuration (visible panels, ...)
  interface: GraphicalInterface = {
    isMobile: false,
    helpVisible: false,
    drawingPanelVisible: false,
    printPanelVisible: false,
    extLayerPanelVisible: false,
    lidarPanelVisible: false,
    crossSectionPanelVisible: false,
    editPanelVisible: false,
    sharePanelVisible: false,
    selectionComponentVisible: false,
    selectionComponent: '',
    layoutPanelVisible: false,
    aboutPanelVisible: false,
    userPreferencesPanelVisible: false,
    infoWindowVisible: false,
    darkMapMode: false,
    // TODO: remove of adjust this when the component UserDataManager is monted on mobile UI
    darkFrontendMode: systemIsInDarkMode() ?? false,
    swipeupPanelMode: 'closed',
    contactPanelVisible: false,
    swipeupPanelContent: 'selector'
  };

  userInteractionListeners: GgUserInteractionListener[] = [];

  // Current language
  language: string | null = null;

  // LIDAR
  lidar: Lidar = {
    line: null,
    drawActive: false
  };

  // Is the application currently loading map data?
  loading = false;

  // Global variables that represent the state of the application.
  // They can be used when waiting for big steps in the app.
  application = {
    isConfigurationLoaded: false,
    // This doesn't mean that the user is authenticated, just that the authentication-processed is initialized (including silent login)
    isAuthInitialized: false,
    // This doesn't mean that a shared state was loaded, just that the processed is finished
    isStateInitialized: false,
    // Everything needed by GeoGirafe to work properly has been loaded
    isReady: false
  };

  // Current position configuration of the map
  @BrainSerialize
  position = new MapPosition();

  // Current layers configuration
  @BrainSerialize
  layers = new LayersConfig();

  // Current Treeview state
  treeview: TreeviewConfig = {
    renderEnabled: true
  };

  snapActive: boolean = false;

  // Current Print state
  print: PrintConfig = {
    maskVisible: false,
    pageSize: null,
    format: null,
    scale: null,
    dpi: null
  };

  // Current 3D-Globe state
  @BrainSerialize
  globe: GlobeConfig = {
    // Possible values : ['3D, '2D/3D', '2D']
    display: '2D',
    loaded: false,
    shadows: false,
    shadowsTimestamp: new Date().valueOf(),
    camera: null
  };

  // TODO REG : What is this used for?
  // Is it the default theme configured in the user preferences?
  // Do we really need this?
  theme: Theme | null = null;

  // To manage selected and focused features
  @BrainSerialize
  selection = new ObjectSelection();

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
  isOffline = false;

  oauth: LoginState = {
    status: 'loggedOut',
    audience: []
  };

  // The State object is defined as <not extensible> by the StateManager.
  // This property can be used by third-parts components or extensions
  // to add custom attributes to the state.
  extendedState: ExtendedState = {};
}
