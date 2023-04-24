class Basemap {

  // Properties
  id = null;
  name = null;
  projection = null;

  // Layers
  layersList = [];

  constructor(elem) {
    this.id = elem.id;
    this.name = elem.name;
    this.projection = elem.projection;
  }
}

export default Basemap
