import Layer from '../../models/layers/layer';
import Feature from 'ol/Feature';
import Basemap from '../../models/basemap';
import Theme from '../../models/theme';
import BaseLayer from '../../models/layers/baselayer';
import LayerWms from '../../models/layers/layerwms';
import MapPosition from './mapposition';

type GraphicalInterface = {
  helpVisible: boolean;
  redliningPanelVisible: boolean;
  printPanelVisible: boolean;
  selectionGridVisible: boolean;
  aboutVisible: boolean;
  shareVisible: boolean;
  darkMapMode: boolean;
  darkFrontendMode: boolean;
};

export type SelectionParam = {
  layers: LayerWms[];
  selectionBox: number[];
  srid: string;
};

type Selection = {
  selectionParameters: SelectionParam[];
  selectedFeatures: Feature[];
  focusedFeature: Feature | null;
  enabled: boolean;
};

type LayersConfig = {
  layersList: BaseLayer[];
  swipedLayers: {
    left: Layer[];
    right: Layer[];
  };
};

type TreeviewConfig = {
  advanced: boolean;
};

// Current Print state
type PrintConfig = {
  maskVisible: boolean;
  pageSize: [number, number] | null;
  format: string | null;
  scale: number | null;
  dpi: number | null;
};

export type ServerOgc = {
  url: string;
  wfsSupport: boolean;
  urlWfs: string;
  type: string;
  imageType: string;
};

// Current 3D-Globe state
type GlobeConfig = {
  display: 'none' | 'full' | 'side';
  loaded: boolean;
};

export type InfoBoxContent = {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'error';
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
  themes: Record<number, Theme> = {};

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
    redliningPanelVisible: false,
    printPanelVisible: false,
    selectionGridVisible: false,
    aboutVisible: false,
    shareVisible: false,
    darkMapMode: false,
    darkFrontendMode: false
  };

  // Current language
  language: string | null = null;

  // Is the application currently loading data ?
  loading = false;

  // Current position configuration of the map
  position: MapPosition = new MapPosition();

  // Lastly selected theme
  selectedTheme: Theme | null = null;

  // Current layers configuration
  layers: LayersConfig = {
    layersList: [],
    swipedLayers: {
      left: [],
      right: []
    }
  };

  // Current Treeview state
  treeview: TreeviewConfig = {
    advanced: false
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
    // Possible values : ['full, 'side', 'none']
    display: 'none',
    loaded: false
  };

  // To manage selected and focused features
  selection: Selection = {
    selectionParameters: [],
    selectedFeatures: [],
    focusedFeature: null,
    enabled: true
  };

  theme: Theme | null = null;

  infobox = {
    elements: [] as InfoBoxContent[]
  };

  // The State object is defined as <not extensible> by the StateManager.
  // This property can be used by third-parts components or extensions
  // to add custom attributes to the state.
  extendedState: Record<string, object> = {};
}
