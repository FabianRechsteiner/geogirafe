import BaseLayer from "./layers/baselayer";

class Theme {
  // Properties
  id: number;
  icon: string;
  name: string;

  // Layers
  layersTree: BaseLayer[] = [];

  constructor(elem: { id: number, name: string, icon: string }) {
    this.id = elem.id;
    this.name = elem.name;
    this.icon = elem.icon;
  }
}

export default Theme;
