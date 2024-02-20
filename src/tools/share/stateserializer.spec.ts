import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GroupLayer, LayerWmts } from '../../models/main';
import StateSerializer from './stateserializer';
import MockHelper from '../tests/mockhelper';
import { State } from '../main';
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
    const groupLayer = new GroupLayer(
      {
        id: 11,
        name: 'Group 1',
        metadata: {
          isLegendExpanded: false,
          wasLegendExpanded: false,
          exclusiveGroup: false,
          isExpanded: false,
          isChecked: false
        }
      },
      10
    );
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
    const groupLayer = new GroupLayer(
      {
        id: 11,
        name: 'Group 1',
        metadata: {
          isLegendExpanded: false,
          wasLegendExpanded: false,
          exclusiveGroup: false,
          isExpanded: true,
          isChecked: false
        }
      },
      10
    );
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
    const groupLayer = new GroupLayer(
      {
        id: 11,
        name: 'Group 1',
        metadata: {
          isLegendExpanded: false,
          wasLegendExpanded: false,
          exclusiveGroup: false,
          isExpanded: false,
          isChecked: false
        }
      },
      10
    );
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
    const groupLayer = new GroupLayer(
      {
        id: 11,
        name: 'Group 1',
        metadata: {
          isLegendExpanded: false,
          wasLegendExpanded: false,
          exclusiveGroup: false,
          isExpanded: false,
          isChecked: false
        }
      },
      10
    );

    const wmtsLayer = new LayerWmts(
      {
        id: 21,
        name: 'Layer WMTS 1',
        url: 'https://test.url/',
        layer: 'test_layer',
        metadata: {
          isLegendExpanded: false,
          wasLegendExpanded: false,
          exclusiveGroup: false,
          isExpanded: false,
          isChecked: false
        }
      },
      20
    );
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
      l: [],
      f: []
    });
  });
});
