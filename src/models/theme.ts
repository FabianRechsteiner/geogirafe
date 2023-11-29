import BaseLayer from "./layers/baselayer";
import { Coordinate } from 'ol/coordinate';

class Theme {
  // Properties
  id: number;
  icon: string;
  name: string;
  location?: Coordinate;
  zoom?: number;

  // Layers
  layersTree: BaseLayer[] = [];

  constructor(elem: { id: number, name: string, icon: string, location?: Coordinate, zoom?: number }) {
    this.id = elem.id;
    this.name = elem.name;
    this.icon = elem.icon;
    this.location = elem.location;
    this.zoom = elem.zoom;
  }
}

export default Theme;
