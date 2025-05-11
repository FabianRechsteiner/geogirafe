import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import GroupLayer from '../../models/layers/grouplayer';
import LayerWmts from '../../models/layers/layerwmts';
import StateSerializer from './stateserializer';
import MockHelper from '../tests/mockhelper';
import State from '../state/state';
import LZString from 'lz-string';
import { SharedState } from './sharedstate';
import Basemap from '../../models/basemap';
import ThemeLayer from '../../models/layers/themelayer';
import StateManager from '../state/statemanager';

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
    const theme = new ThemeLayer(1, 'test-theme', 0);
    const groupLayer = new GroupLayer(11, 'Group 1', 10);
    theme.children.push(groupLayer);
    StateManager.getInstance().state.themes._allThemes[theme.id] = theme;

    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(groupLayer);

    expect(sharedLayer).toEqual({
      i: 11,
      o: 10,
      c: 0,
      e: 0,
      z: [],
      x: []
    });
  });

  it('should return serialized data for a GroupLayer (isExpanded)', () => {
    const theme = new ThemeLayer(1, 'test-theme', 0);
    const groupLayer = new GroupLayer(11, 'Group 1', 10, { isDefaultExpanded: true });
    theme.children.push(groupLayer);
    StateManager.getInstance().state.themes._allThemes[theme.id] = theme;

    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(groupLayer);

    expect(sharedLayer).toEqual({
      i: 11,
      o: 10,
      c: 0,
      e: 1,
      z: [],
      x: []
    });
  });

  it('should return serialized data for a GroupLayer (isChecked)', () => {
    const theme = new ThemeLayer(1, 'test-theme', 0);
    const groupLayer = new GroupLayer(11, 'Group 1', 10);
    groupLayer.activeState = 'on';
    theme.children.push(groupLayer);
    StateManager.getInstance().state.themes._allThemes[theme.id] = theme;

    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(groupLayer);

    expect(sharedLayer).toEqual({
      i: 11,
      o: 10,
      c: 1,
      e: 0,
      z: [],
      x: []
    });
  });

  it('should return serialized data for a GroupLayer with children', () => {
    const theme = new ThemeLayer(1, 'test-theme', 0);
    const groupLayer = new GroupLayer(11, 'Group 1', 10);
    theme.children.push(groupLayer);
    StateManager.getInstance().state.themes._allThemes[theme.id] = theme;

    const wmtsLayer = new LayerWmts(21, 'Layer WMTS 1', 20, 'https://test.url/', 'test_layer');
    groupLayer.children.push(wmtsLayer);
    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(groupLayer);

    expect(sharedLayer).toEqual({
      i: 11,
      o: 10,
      c: 0,
      e: 0,
      z: [{ i: 21, o: 20, c: 0, e: 0, z: [], x: [] }],
      x: []
    });
  });

  it('should serialize a missing original group correctly (explicitely removed)', () => {
    const theme = new ThemeLayer(0, 'test-theme', 0);
    StateManager.getInstance().state.themes._allThemes[theme.id] = theme;

    const groupLayer1 = new GroupLayer(1, 'Group 1', 1);
    const groupLayer11 = new GroupLayer(11, 'Group 11', 11);
    const groupLayer12 = new GroupLayer(12, 'Group 12', 12);
    groupLayer1.children.push(groupLayer11, groupLayer12);
    theme.children.push(groupLayer1);

    // Clone the original object and remove a child
    const clone = groupLayer1.clone();
    clone.children.splice(1, 1);
    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(clone);

    expect(sharedLayer).toEqual({
      i: 1,
      o: 1,
      c: 0,
      e: 0,
      x: [12],
      z: [
        {
          i: 11,
          o: 11,
          c: 0,
          e: 0,
          x: [],
          z: []
        }
      ]
    });
  });

  it('should serialize a missing original layer correctly (explicitely removed)', () => {
    const theme = new ThemeLayer(0, 'test-theme', 0);
    StateManager.getInstance().state.themes._allThemes[theme.id] = theme;

    const groupLayer1 = new GroupLayer(1, 'Group 1', 1);
    const layer1 = new LayerWmts(3, 'Layer 1', 3, 'https://test.url/', 'test_layer_1');
    const layer2 = new LayerWmts(4, 'Layer 2', 4, 'https://test.url/', 'test_layer_2');
    groupLayer1.children.push(layer1, layer2);
    theme.children.push(groupLayer1);

    // Clone the original object and remove a child
    const clone = groupLayer1.clone();
    clone.children.splice(1, 1);
    // @ts-ignore
    const sharedLayer = serializer.getSerializedLayer(clone);

    expect(sharedLayer).toEqual({
      i: 1,
      o: 1,
      c: 0,
      e: 0,
      x: [4],
      z: [
        {
          i: 3,
          o: 3,
          c: 0,
          e: 0,
          x: [],
          z: []
        }
      ]
    });
  });
});

describe('StateSerializer.getSerializedState', () => {
  it('should serialized state correctly if no basemap', () => {
    const state = new State();
    state.projection = 'EPSG:4326';
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
      m: {
        p: 'EPSG:4326'
      },
      t: {
        a: 0
      },
      g: {
        d: '2D'
      },
      l: []
    });
  });

  it('should serialize state with active basemap', () => {
    const state = new State();
    state.projection = 'EPSG:4326';
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
      m: {
        p: 'EPSG:4326'
      },
      t: {
        a: 0
      },
      g: {
        d: '2D'
      },
      l: [],
      b: { i: 1 }
    });
  });

  it('should serialize a complex layer tree with multiple levels', () => {
    const theme = new ThemeLayer(0, 'test-theme', 0);
    StateManager.getInstance().state.themes._allThemes[theme.id] = theme;

    const groupLayer1 = new GroupLayer(1, 'Group 1', 1);
    const groupLayer2 = new GroupLayer(2, 'Group 2', 2);
    const layer1 = new LayerWmts(3, 'Layer 1', 3, 'https://test.url/', 'test_layer_1');
    const layer2 = new LayerWmts(4, 'Layer 2', 4, 'https://test.url/', 'test_layer_2');

    theme.children.push(groupLayer1);

    groupLayer2.children.push(layer1);
    groupLayer1.children.push(groupLayer2, layer2);

    StateManager.getInstance().state.layers.layersList.push(theme);

    const compressedState = serializer.getSerializedState(StateManager.getInstance().state);

    // Decode to verify
    const stringState = LZString.decompressFromBase64(compressedState);
    const sharedState: SharedState = JSON.parse(stringState);

    expect(sharedState.l).toEqual([
      {
        c: 0,
        e: 1,
        i: 0,
        o: 0,
        x: [],
        z: [
          {
            c: 0,
            e: 0,
            i: 1,
            o: 1,
            x: [],
            z: [
              {
                c: 0,
                e: 0,
                i: 2,
                o: 2,
                x: [],
                z: [
                  {
                    c: 0,
                    e: 0,
                    i: 3,
                    o: 3,
                    x: [],
                    z: []
                  }
                ]
              },
              {
                c: 0,
                e: 0,
                i: 4,
                o: 4,
                x: [],
                z: []
              }
            ]
          }
        ]
      }
    ]);
  });
});
