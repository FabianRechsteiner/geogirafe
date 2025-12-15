import IGirafeContext from '../../tools/context/icontext';
import type { IBrainSerializer } from '../../tools/state/brain/serialize';
import DrawingFeature, { DrawingState, type SerializedFeature } from './drawingFeature';

export default class DrawingSerializer implements IBrainSerializer<DrawingState> {
  private readonly context: IGirafeContext;

  public constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  public brainSerialize(drawingState: DrawingState): string {
    const serializedDrawings: SerializedFeature[] = [];
    for (const feature of drawingState.features) {
      serializedDrawings.push(feature.serialize());
    }
    return JSON.stringify(serializedDrawings);
  }

  public brainDeserialize(str: string) {
    const serializedFeatures = JSON.parse(str);
    if (serializedFeatures) {
      if (this.state.extendedState.drawing) {
        // First, delete existing drawing features in the state before adding new ones.
        //  This will trigger removal of the ol features in the map.
        const drawingState = this.state.extendedState.drawing as DrawingState;
        drawingState.features.splice(0, drawingState.features.length);
      } else {
        this.state.extendedState.drawing = new DrawingState();
      }
      serializedFeatures.forEach((f: SerializedFeature) => DrawingFeature.deserialize(f, this.context));
    } else {
      throw new Error(`Cannot deserialize drawings`);
    }
  }
}
