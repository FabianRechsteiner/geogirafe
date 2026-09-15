// SPDX-License-Identifier: Apache-2.0
import { Coordinate } from 'ol/coordinate';

class Theme {
  // Properties
  public id: number;
  public icon?: string;
  public name: string;
  public location?: Coordinate;
  public zoom?: number;

  public constructor(elem: { id: number; name: string; icon: string; location?: Coordinate; zoom?: number }) {
    this.id = elem.id;
    this.name = elem.name;
    this.icon = elem.icon;
    this.location = elem.location;
    this.zoom = elem.zoom;
  }
}

export default Theme;
