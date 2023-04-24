class Theme {

  // Properties
  id = null;
  icon = null;
  name = null;

  // Layers
  layersTree = [];

  constructor(elem) {
    this.id = elem.id;
    this.name = elem.name;
    this.icon = elem.icon;
  }
}

export default Theme
