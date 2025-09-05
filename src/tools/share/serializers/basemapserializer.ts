import Basemap from '../../../models/basemaps/basemap';
import { IBrainSerializer } from '../../state/brain/serialize';
import StateManager from '../../state/statemanager';

export default class BasemapSerializer implements IBrainSerializer<Basemap> {
  private readonly stateManager: StateManager;

  constructor() {
    this.stateManager = StateManager.getInstance();
  }

  private get state() {
    return this.stateManager.state;
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
