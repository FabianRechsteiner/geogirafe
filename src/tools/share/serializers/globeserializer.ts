import IGirafeContext from '../../context/icontext';
import { IBrainSerializer } from '../../state/brain/serialize';
import GlobeState from '../../state/globe';

export default class GlobeSerializer implements IBrainSerializer<GlobeState> {
  private readonly context: IGirafeContext;

  constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get globe() {
    return this.context.stateManager.state.globe;
  }

  public brainSerialize(globe: GlobeState): string {
    return JSON.stringify({
      display: globe.display,
      shadows: globe.shadows,
      shadowsTimestamp: globe.shadowsTimestamp,
      camera: globe.camera
    });
  }

  public brainDeserialize(str: string): void {
    const parsedGlobe = JSON.parse(str) as Partial<GlobeState>;
    const globe = this.globe;

    if (parsedGlobe.display) {
      globe.display = parsedGlobe.display;
    }
    if (parsedGlobe.shadows !== undefined) {
      globe.shadows = parsedGlobe.shadows;
    }
    if (parsedGlobe.shadowsTimestamp) {
      globe.shadowsTimestamp = parsedGlobe.shadowsTimestamp;
    }
    globe.camera = parsedGlobe.camera ?? null;
    globe.loaded = false;
  }
}
