import Map from 'ol/Map';
import Layer from '../../models/layer';
import Feature from 'ol/Feature';
import Basemap from '../../models/basemap';

type GraphicalInterface = {
  helpVisible: boolean,
  redliningPanelVisible: boolean,
  printPanelVisible: boolean,
  selectionGridVisible: boolean,
  aboutVisible: boolean
}

type MapPosition = {
  center: number[];
  zoom: number | null;
  resolution: number | null;
  scale: number | null;
}

type LayersConfig = {
  layersList: Layer[];
  swipedLayers: {
    left: string[];
    right: string[];
  }
}

type RedliningConfig = {
  activeTool: boolean | null;
  features: Object[];
}

type TreeviewConfig = {
  advanced: boolean;
}

// Current Print state
type PrintConfig = {
  format: string | null;
  scale: number | null;
}


// Current 3D-Globe state
type GlobeConfig = {
  display: 'none' | 'full' | 'side';
}

class State {

  // All themes from themes.json
  // Dictionary where the key is the id of the theme
  themes = {};

  // All basemaps from themes.json
  // Dictionary where the key is the id of the basemap
  basemaps: {
    [key: number]: Basemap
  } = {};

  // All OCG Servers from themes.json
  // Dictionary where the key is the name of the server
  ogcServers: {
    [key: string]: {
      url: string;
      wfsSupport: boolean;
      urlWfs: string;
    }
  } = {};

  // Current active basemap
  activeBasemap: Basemap | null = null;

  // Current projection
  projection: string | null = null;

  // Current mouse coordinates
  mouseCoordinates: number[] = [];

  // Interface configuration (visible panels, ...)
  interface: GraphicalInterface = {
    helpVisible: false,
    redliningPanelVisible: false,
    printPanelVisible: false,
    selectionGridVisible: false,
    aboutVisible: false
  }

  // Current language
  language: string | null = null;

  // Is the application currently loading data ?
  loading = false;

  // Current position configuration of the map
  // TODO REG : When zoom, resolution or scale is changed, calculate the other values
  position: MapPosition = {
    center: [],
    zoom: null,
    resolution: null,
    scale: null
  }

  // Lastly selected theme
  selectedTheme = {};

  // Current layers configuration
  layers: LayersConfig = {
    layersList: [],
    swipedLayers: {
      left: [],
      right: []
    }
  }

  // Current redlining state
  redlining: RedliningConfig = {
    activeTool: null,
    features: []
  }

  // Current Treeview state
  treeview: TreeviewConfig = {
    advanced: false
  }

  // Current Print state
  print: PrintConfig = {
    format: null,
    scale: null
  }

  // Current 3D-Globe state
  globe: GlobeConfig = {
    // Possible values : ['full, 'side', 'none']
    display: 'none',
  }

  // The openlayer map
  // Keep in mind that you shoudn't use it directly to add layers or drawings,
  // because the components are not listening to olMap changes, and the application will be desynchronized.
  // => Consider using the other properties of the state, which components are listening to
  olMap: Map | null = null;

  // To manage selected and focused features
  selectedFeatures: Feature[] = [];
  focusedFeature: Feature | null = null;

  theme: Object | null = null;

  // The State object is defined as <not extensible> by the StateManager.
  // This property can be used by third-parts components or extensions
  // to add custom attributes to the state.
  extendedState = {};
}

export default State;

