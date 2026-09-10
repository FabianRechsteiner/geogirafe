// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { formatCoordinates } from '../../tools/geometrytools';
import { transform } from 'ol/proj';

class CoordinateComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css'];

  #locale?: string;
  east: string | null = null;
  north: string | null = null;

  public constructor() {
    super('coordinate');
  }

  get locale() {
    if (!this.#locale) {
      throw new Error('You called locale before render');
    }
    return this.#locale;
  }

  override render() {
    super.render();
    this.#locale = this.context.configManager.Config.general.locale;
  }

  registerEvents() {
    this.subscribe('mouseCoordinates', (_oldCoordinates: number[], newCoordinates: number[]) =>
      this.onChangeCoordinates(newCoordinates)
    );
  }

  onChangeCoordinates(coord: number[]) {
    const projection = this.getAttribute('projection');
    const displayCoordinates = projection ? transform(coord, this.state.projection, projection) : coord;
    [this.east, this.north] = formatCoordinates(displayCoordinates, this.locale);
    this.render();
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.render();
    super.girafeTranslate();
    this.registerEvents();
  }
}

export default CoordinateComponent;
