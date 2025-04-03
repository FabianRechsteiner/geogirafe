import { Coordinate } from 'ol/coordinate';

class Theme {
  // Properties
  id: number;
  icon?: string;
  name: string;
  location?: Coordinate;
  zoom?: number;

  constructor(elem: { id: number; name: string; icon: string; location?: Coordinate; zoom?: number }) {
    this.id = elem.id;
    this.name = elem.name;
    this.icon = elem.icon;
    this.location = elem.location;
    this.zoom = elem.zoom;
  }
}

export default Theme;
