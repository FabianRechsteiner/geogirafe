import MapPosition from './mapposition';
import GlobeState from './globe';
import type Basemap from '../../models/basemaps/basemap';
import type ThemeLayer from '../../models/layers/themelayer';
import type OlGeomLineString from 'ol/geom/LineString';
import type ServerOgc from '../../models/serverogc';
import { BrainSerialize } from './brain/decorators';
import LayersConfig from './layersConfig';
import type { TokenEndpointResponse } from 'oauth4webapi';
import type { GgUserInteractionListener } from './userInteractionManager';
import type CustomTheme from '../../models/customtheme';
import ObjectSelection from './objectselection';
import type Theme from '../../models/theme';
import GraphicalInterface from './graphicalInterface';

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

export type InfoBoxContent = {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'error';
  duration?: number;
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
    | 'not-initialized'
    | 'issuer.loggedIn'
    | 'loggedIn'
    | 'loginFailed'
    | 'backend.loggedOut'
    | 'loggedOut'
    | 'logoutFailed';
  tokens?: TokenEndpointResponse;
  userInfo?: UserInfo;
  audience: string[];
  error?: string;
  somethingChanged: boolean;
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
  public themes: ThemesConfig = {
    _allThemes: {},
    isLoaded: false,
    lastSelectedTheme: null
  };

  // All basemaps from themes.json
  // Dictionary where the key is the id of the basemap
  public basemaps: Record<number, Basemap> = {};

  // All OCG Servers from themes.json
  // Dictionary where the key is the name of the server
  public ogcServers: Record<string, ServerOgc> = {};

  // Current active basemaps
  @BrainSerialize
  public activeBasemaps: Basemap[] = [];

  // Current projection
  @BrainSerialize
  public projection!: string;

  // Current mouse coordinates
  public mouseCoordinates: number[] = [];

  // Interface configuration (visible panels, ...)
  @BrainSerialize
  public interface: GraphicalInterface = new GraphicalInterface();

  public userInteractionListeners: GgUserInteractionListener[] = [];

  // Current language
  public language: string | null = null;

  // LIDAR
  public lidar: Lidar = {
    line: null,
    drawActive: false
  };

  // Is the application currently loading map data?
  public loading = false;

  // Global variables that represent the state of the application.
  // They can be used when waiting for big steps in the app.
  public application = {
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
  public position = new MapPosition();

  // Current layers configuration
  @BrainSerialize
  public layers = new LayersConfig();

  // Current Treeview state
  public treeview: TreeviewConfig = {
    renderEnabled: true
  };

  // Current Print state
  public print: PrintConfig = {
    maskVisible: false,
    pageSize: null,
    format: null,
    scale: null,
    dpi: null
  };

  // Current 3D-Globe state
  @BrainSerialize
  public globe: GlobeState = new GlobeState();

  // TODO REG : What is this used for?
  // Is it the default theme configured in the user preferences?
  // Do we really need this?
  public theme: Theme | null = null;

  // To manage selected and focused features
  @BrainSerialize
  public selection = new ObjectSelection();

  public infobox = {
    elements: [] as InfoBoxContent[]
  };

  public infoWindow: InfoWindow = {
    title: null,
    url: null,
    width: null,
    height: null,
    top: null,
    left: null
  };

  // Indicates is the application is currently used in offline mode
  public isOffline = false;

  public oauth: LoginState = {
    status: 'not-initialized',
    audience: [],
    somethingChanged: true
  };

  // The State object is defined as <not extensible> by the StateManager.
  // This property can be used by third-parts components or extensions
  // to add custom attributes to the state.
  public extendedState: ExtendedState = {};
}
