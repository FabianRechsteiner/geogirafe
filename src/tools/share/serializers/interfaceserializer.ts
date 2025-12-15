import IGirafeContext from '../../context/icontext';
import { IBrainSerializer } from '../../state/brain/serialize';
import GraphicalInterface from '../../state/graphicalInterface';

export default class InterfaceSerializer implements IBrainSerializer<GraphicalInterface> {
  private readonly context: IGirafeContext;

  public constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  public brainSerialize(graphicalInterface: GraphicalInterface): string {
    const shared = {
      searchComponentVisible: graphicalInterface.searchComponentVisible,
      basemapComponentVisible: graphicalInterface.basemapComponentVisible
    };

    return JSON.stringify(shared);
  }

  public brainDeserialize(str: string) {
    const shared = JSON.parse(str);
    this.state.interface.searchComponentVisible = shared.searchComponentVisible;
    this.state.interface.basemapComponentVisible = shared.basemapComponentVisible;
  }
}
