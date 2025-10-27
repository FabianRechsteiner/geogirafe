import { IBrainSerializer } from '../../state/brain/serialize';
import { GraphicalInterface } from '../../state/state';
import StateManager from '../../state/statemanager';

export default class InterfaceSerializer implements IBrainSerializer<GraphicalInterface> {
  stateManager: StateManager;

  constructor() {
    this.stateManager = StateManager.getInstance();
  }

  private get state() {
    return this.stateManager.state;
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
