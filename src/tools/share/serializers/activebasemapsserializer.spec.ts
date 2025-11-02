import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import ActiveBasemapsSerializer from './activebasemapsserializer';
import MockHelper from '../../tests/mockhelper';
import Basemap from '../../../models/basemaps/basemap';
import BasemapEmpty from '../../../models/basemaps/basemapempty';
import IGirafeContext from '../../context/icontext';

let context: IGirafeContext;
let serializer: ActiveBasemapsSerializer;

beforeAll(() => {
  context = MockHelper.startMocking();
  serializer = new ActiveBasemapsSerializer(context);
});

afterAll(() => {
  MockHelper.stopMocking(context);
});

beforeEach(() => {
  const state = context.stateManager.state;
  state.basemaps = {};
  state.activeBasemaps = [new BasemapEmpty()];
});

describe('ActiveBasemapsSerializer.serialize', () => {
  it('should serialize basemaps', () => {
    const basemaps = [
      new Basemap({
        id: 1,
        name: 'OpenStreetMap'
      })
    ];

    const serialized = serializer.brainSerialize(basemaps);
    expect(serialized).toBe('1=-1');
  });
});

describe('ActiveBasemapsSerializer.deserialize', () => {
  it('should deserialize a valid basemap id and set it as activeBasemap', () => {
    const basemaps = [
      new Basemap({
        id: 1,
        name: 'OpenStreetMap'
      })
    ];
    basemaps.forEach((basemap) => {
      context.stateManager.state.basemaps[basemap.id] = basemap;
    });
    serializer.brainDeserialize('1=-1');
    const state = context.stateManager.state;
    expect(state.activeBasemaps).toBeInstanceOf(Array<Basemap>);
    expect(state.activeBasemaps[0].id).toBe(basemaps[0].id);
    expect(state.activeBasemaps[0].opacity).toBe(-1);
  });
  it('deserializing with non existing IDs should throw an Error', () => {
    const basemaps = [
      new Basemap({
        id: 1,
        name: 'OpenStreetMap'
      })
    ];
    basemaps.forEach((basemap) => {
      context.stateManager.state.basemaps[basemap.id] = basemap;
    });
    expect(() => serializer.brainDeserialize('1=-1;2=0;42=0.45')).toThrow(
      new Error(`Some basemaps could not be deserialized: 2,42.`)
    );
  });
});
