import Basemap from '../../../models/basemaps/basemap';
import { IBrainSerializer } from '../../state/brain/serialize';
import { applyOpacityToLayers } from '../../utils/utils';
import { DEFAULT_OPACITY } from '../../themes/themes-config';
import IGirafeContext from '../../context/icontext';

export default class ActiveBasemapsSerializer implements IBrainSerializer<Basemap[]> {
  private readonly context: IGirafeContext;

  public constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  public brainSerialize(basemaps: Basemap[]): string {
    const serializedBasemaps = basemaps
      .map((basemap) => `${basemap.id.toString()}=${basemap.opacity.toString()}`)
      .join(';');
    console.debug(`Serialized Basemaps to ${serializedBasemaps}`);
    return serializedBasemaps;
  }

  public brainDeserialize(serializedString: string) {
    console.debug(`Deserializing Basemaps from ${serializedString}`);
    const basemapIdsWithOpacities = Object.fromEntries(
      serializedString.split(';').map((idAndOpacity) => idAndOpacity.split('=').map(Number))
    ) as Record<number, number>;
    const basemapIds = Object.keys(basemapIdsWithOpacities).map(Number);
    const basemaps = Object.values(this.state.basemaps).filter((b) => basemapIds.includes(b.id));
    for (const basemap of basemaps) {
      basemap.opacity = basemapIdsWithOpacities[basemap.id] ?? DEFAULT_OPACITY;
      applyOpacityToLayers(basemap.opacity === -1 ? 1 : basemap.opacity, basemap.layersList);
    }

    if (basemaps.length > 0) {
      this.state.activeBasemaps = basemaps;
    } else {
      console.debug('No Basemaps could be deserialized => not changing state.activeBasemaps');
    }
    if (basemaps.length != basemapIds.length) {
      const missingIds = basemapIds.filter((id) => basemaps.findIndex((basemap) => basemap.id == id) == -1); //NOSONAR(typescript:S7754) It IS about the Indexes
      throw new Error(`Some basemaps could not be deserialized: ${missingIds.join(',')}.`);
    }
  }
}
