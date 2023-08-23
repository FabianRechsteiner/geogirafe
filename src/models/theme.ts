import Layer from "./layer";

class Theme {
  // Properties
  id: number;
  icon: string;
  name: string;

  // Layers
  layersTree: Layer[] = [];

  constructor(elem: { id: number, name: string, icon: string }) {
    this.id = elem.id;
    this.name = elem.name;
    this.icon = elem.icon;
  }
}

export default Theme;
