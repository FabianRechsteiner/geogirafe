import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import GroupLayer from '../../models/layers/grouplayer';
import LayerWmts from '../../models/layers/layerwmts';
import StateSerializer from './stateserializer';
import MockHelper from '../tests/mockhelper';
import State from '../state/state';
import LZString from 'lz-string';
import { SharedState } from './sharedstate';

let serializer: StateSerializer;

beforeAll(() => {
  MockHelper.startMocking();
  serializer = new StateSerializer();
});

afterAll(() => {
  MockHelper.stopMocking();
});

describe('StateSerializer.getSerializedLayer', () => {
  it('should return serialized data for a GroupLayer (id, order)', () => {
    const groupLayer = new GroupLayer(11, 'Group 1', 10);
    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(groupLayer);

    expect(sharedLayer).toEqual({
      i: 11,
      o: 10,
      c: 0,
      e: 0,
      z: []
    });
  });

  it('should return serialized data for a GroupLayer (isExpanded)', () => {
    const groupLayer = new GroupLayer(11, 'Group 1', 10, { isDefaultExpanded: true });
    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(groupLayer);

    expect(sharedLayer).toEqual({
      i: 11,
      o: 10,
      c: 0,
      e: 1,
      z: []
    });
  });

  it('should return serialized data for a GroupLayer (isChecked)', () => {
    const groupLayer = new GroupLayer(11, 'Group 1', 10);
    groupLayer.activeState = 'on';

    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(groupLayer);

    expect(sharedLayer).toEqual({
      i: 11,
      o: 10,
      c: 1,
      e: 0,
      z: []
    });
  });

  it('should return serialized data for a GroupLayer with children', () => {
    const groupLayer = new GroupLayer(11, 'Group 1', 10);

    const wmtsLayer = new LayerWmts(21, 'Layer WMTS 1', 20, 'https://test.url/', 'test_layer');
    groupLayer.children.push(wmtsLayer);
    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(groupLayer);

    expect(sharedLayer).toEqual({
      i: 11,
      o: 10,
      c: 0,
      e: 0,
      z: [{ i: 21, o: 20, c: 0, e: 0, z: [] }]
    });
  });
});

describe('StateSerializer.getSerializedState', () => {
  it('should serialized state correctly if no basemap', () => {
    const state = new State();
    state.position.center = [22, 33];
    state.position.resolution = 99.987;
    const compressedState = serializer.getSerializedState(state);

    // Decode to verify
    const stringState = LZString.decompressFromBase64(compressedState);
    const sharedState: SharedState = JSON.parse(stringState);

    expect(sharedState).toEqual({
      p: {
        c: [22, 33],
        r: 99.987
      },
      t: {
        a: 0
      },
      g: {
        d: 'none'
      },
      l: []
    });
  });
});
