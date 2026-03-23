// SPDX-License-Identifier: Apache-2.0
import IGirafeContext from '../../context/icontext';
import { IBrainSerializer } from '../../state/brain/serialize';
import MapPosition from '../../state/mapposition';

export default class MapPositionSerializer implements IBrainSerializer<MapPosition> {
  private readonly context: IGirafeContext;

  public constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  public brainSerialize(mapPosition: MapPosition): string {
    const pos = {
      center: mapPosition.center,
      resolution: mapPosition.resolution,
      crosshair: mapPosition.crosshair,
      tooltip: mapPosition.tooltip
    };

    return JSON.stringify(pos);
  }

  public brainDeserialize(str: string) {
    const pos = JSON.parse(str);
    const mapPosition = new MapPosition();
    mapPosition.center = pos.center;
    mapPosition.resolution = pos.resolution;
    mapPosition.crosshair = pos.crosshair;
    mapPosition.tooltip = pos.tooltip;

    this.state.position = mapPosition;
  }
}
