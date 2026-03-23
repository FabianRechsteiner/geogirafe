// SPDX-License-Identifier: Apache-2.0
import type { IBrainSerializable } from '../../tools/state/brain/decorators';
import type { IBrainSerializer } from '../../tools/state/brain/serialize';
import IGirafeContext from '../../tools/context/icontext';

export class ShareState implements IBrainSerializable {
  isBrainSerializable = true;
  searchComponentVisible: boolean = false;
  basemapComponentVisible: boolean = false;
}

export class ShareStateSerializer implements IBrainSerializer<ShareState> {
  private readonly context: IGirafeContext;
  private readonly syncToInterface: boolean;

  public constructor(context: IGirafeContext, syncToInterface: boolean = false) {
    this.context = context;
    this.syncToInterface = syncToInterface;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  brainDeserialize(serialized: string): void {
    const deserializedShareState = JSON.parse(serialized) as ShareState;

    this.state.extendedState.share = deserializedShareState;

    if (this.syncToInterface) {
      this.state.interface.searchComponentVisible = deserializedShareState.searchComponentVisible;
      this.state.interface.basemapComponentVisible = deserializedShareState.basemapComponentVisible;
    }
  }

  brainSerialize(shareState: ShareState): string {
    return JSON.stringify(shareState);
  }
}
