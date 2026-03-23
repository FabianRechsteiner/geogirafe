// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ShareState, ShareStateSerializer } from './sharestate';
import MockHelper from '../../tools/tests/mockhelper';

describe('ShareStateSerializer', () => {
  const context = MockHelper.startMocking();
  const defaultState: ShareState = {
    isBrainSerializable: false,
    basemapComponentVisible: false,
    searchComponentVisible: false
  };
  const serializedDefaultState = JSON.stringify(defaultState);

  beforeEach(() => {
    MockHelper.startMocking();

    context.stateManager.state.interface.basemapComponentVisible = true;
    context.stateManager.state.interface.searchComponentVisible = true;
  });

  afterAll(() => {
    MockHelper.stopMocking(context);
  });

  it('deserialize and dont sync to state.interface', () => {
    const serializer = new ShareStateSerializer(context);
    serializer.brainDeserialize(serializedDefaultState);

    expect(context.stateManager.state.interface.basemapComponentVisible).toEqual(true);
    expect(context.stateManager.state.interface.searchComponentVisible).toEqual(true);
  });

  it('deserialize and do sync to state.interface', () => {
    const serializer = new ShareStateSerializer(context, true);
    serializer.brainDeserialize(serializedDefaultState);

    expect(context.stateManager.state.interface.basemapComponentVisible).toEqual(false);
    expect(context.stateManager.state.interface.searchComponentVisible).toEqual(false);
  });
});
