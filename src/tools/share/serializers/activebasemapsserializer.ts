import Basemap from '../../../models/basemaps/basemap';
import { IBrainSerializer } from '../../state/brain/serialize';
import IGirafeContext from '../../context/icontext';
import { SharedBasemap } from './sharedtypes';

export default class ActiveBasemapsSerializer implements IBrainSerializer<Basemap[]> {
  private readonly context: IGirafeContext;

  public constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  private get preferNames(): boolean {
    return this.context.configManager.Config.share?.preferNames ?? false;
  }

  public brainSerialize(activeBasemaps: Basemap[]): string {
    return this.serialize(activeBasemaps);
  }

  public brainDeserialize(serializedString: string) {
    this.state.activeBasemaps = this.deserialize(serializedString);
  }

  private serialize(basemaps: Basemap[]): string {
    const sharedBasemaps = [];
    for (const basemap of basemaps) {
      const sharedBasemap: SharedBasemap = {
        id: basemap.id,
        name: basemap.name,
        opacity: basemap.opacity
      };
      sharedBasemaps.push(sharedBasemap);
    }
    return JSON.stringify(sharedBasemaps);
  }

  private deserialize(str: string): Basemap[] {
    const sharedBasemaps = JSON.parse(str) as SharedBasemap[];
    const basemaps: Basemap[] = [];
    for (const sharedBasemap of sharedBasemaps) {
      const basemap = this.preferNames
        ? Object.values(this.state.basemaps).find((b) => b.name === sharedBasemap.name)
        : Object.values(this.state.basemaps).find((b) => b.id === sharedBasemap.id);
      if (basemap) {
        basemap.opacity = sharedBasemap.opacity;
        basemaps.push(basemap);
      } else {
        console.error(`The basemap ${sharedBasemap.name} could not be deserialized`);
      }
    }
    return basemaps;
  }
}
