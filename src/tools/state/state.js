class State {

  // All themes from themes.json
  // Dictionary where the key is the id of the theme
  themes = {};

  // All basemaps from themes.json
  // Dictionary where the key is the id of the basemap
  basemaps = {};

  // All OCG Servers from themes.json
  // Dictionary where the key is the name of the server
  ogcServers = {};
  
  // Currentlt active basemap
  activeBasemap = null;

  // Current projection
  projection = null;

  // Current mouse coordinates
  mouseCoordinates = [];

  // Interface configuration (visible panels, ...)
  interface = {
    helpVisible: false,
    redliningPanelVisible: false,
    printPanelVisible: false,
    selectionGridVisible: false,
    aboutVisible: false
  }

  // Current language
  language = null;

  // Is the application currently loading data ?
  loading = false;

  // Current position configuration of the map
  // TODO REG : When zoom, resolution or scale is changed, calculate the other values
  position = {
    center: [],
    zoom: null,
    resolution: null,
    scale: null
  }

  // Lastly selected theme
  selectedTheme = {};

  // Current layers configuration
  layers = {
    layersList: [],
    swipedLayers: {
      left: [],
      right: []
    }
  }
  
  // Current redlining state
  redlining = {
    activeTool: null,
    features: []
  }

  // Current Treeview state
  treeview = {
    advanced: false
  }

  // Current Print state
  print = {
    format: null,
    scale: null
  }

  // Current 3D-Globe state
  globe = {
    enabled: false
  }

  // To manage selected and focused features
  selectedFeatures = [];
  focusedFeature = null;




  


  theme = null;

  // The State object is defined as <not extensible> by the StateManager.
  // This property can be used by third-parts components or extensions 
  // to add custom attributes to the state.  
  extendedState = {};
}

export default State;

