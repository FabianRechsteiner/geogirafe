import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import GroupLayer from '../../models/layers/grouplayer';
import LayerWmts from '../../models/layers/layerwmts';
import StateSerializer from './stateserializer';
import MockHelper from '../tests/mockhelper';
import State from '../state/state';
import LZString from 'lz-string';
import { SharedState } from './sharedstate';
import Basemap from '../../models/basemap';

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

  it('should serialize state with active basemap', () => {
    const state = new State();
    state.position.center = [22, 33];
    state.position.resolution = 99.987;
    state.activeBasemap = new Basemap({ id: 1, name: 'test' });
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
      l: [],
      b: { i: 1 }
    });
  });

  it('should serialize a complex layer tree with multiple levels', () => {
    const groupLayer1 = new GroupLayer(1, 'Group 1', 1);
    const groupLayer2 = new GroupLayer(2, 'Group 2', 2);
    const layer1 = new LayerWmts(3, 'Layer 1', 3, 'https://test.url/', 'test_layer_1');
    const layer2 = new LayerWmts(4, 'Layer 2', 4, 'https://test.url/', 'test_layer_2');

    groupLayer2.children.push(layer1);
    groupLayer1.children.push(groupLayer2, layer2);

    const state = new State();
    state.layers.layersList.push(groupLayer1);

    const compressedState = serializer.getSerializedState(state);

    // Decode to verify
    const stringState = LZString.decompressFromBase64(compressedState);
    const sharedState: SharedState = JSON.parse(stringState);

    expect(sharedState.l).toEqual([
      {
        i: 1,
        o: 1,
        c: 0,
        e: 0,
        z: [
          {
            i: 2,
            o: 2,
            c: 0,
            e: 0,
            z: [
              {
                i: 3,
                o: 3,
                c: 0,
                e: 0,
                z: []
              }
            ]
          },
          {
            i: 4,
            o: 4,
            c: 0,
            e: 0,
            z: []
          }
        ]
      }
    ]);
  });
});
