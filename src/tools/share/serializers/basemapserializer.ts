import Basemap from '../../../models/basemaps/basemap';
import IGirafeContext from '../../context/icontext';
import { IBrainSerializer } from '../../state/brain/serialize';

export default class BasemapSerializer implements IBrainSerializer<Basemap> {
  private readonly context: IGirafeContext;

  constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  public brainSerialize(basemap: Basemap): string {
    return basemap.id.toString();
  }

  public brainDeserialize(str: string) {
    const basemapId = Number(str);
    const basemap = Object.values(this.state.basemaps).find((b) => b.id === basemapId);
    if (basemap) {
      this.state.activeBasemap = basemap;
    } else {
      throw new Error(`Cannot deserialize basemap with id ${basemapId}.`);
    }
  }
}
