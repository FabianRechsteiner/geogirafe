import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import BasemapSerializer from './basemapserializer';
import MockHelper from '../../tests/mockhelper';
import Basemap from '../../../models/basemaps/basemap';
import BasemapEmpty from '../../../models/basemaps/basemapempty';
import IGirafeContext from '../../context/icontext';

let serializer: BasemapSerializer;
let context: IGirafeContext;

beforeAll(() => {
  context = MockHelper.startMocking();
  serializer = new BasemapSerializer(context);
});

afterAll(() => {
  MockHelper.stopMocking(context);
});

beforeEach(() => {
  const state = context.stateManager.state;
  state.basemaps = {};
  state.activeBasemap = new BasemapEmpty();
});

describe('BasemapSerializer.serialize', () => {
  it('should serialize basemap', () => {
    const basemap = new Basemap({
      id: 1,
      name: 'OpenStreetMap'
    });

    const serialized = serializer.brainSerialize(basemap);
    expect(serialized).toBe('1');
  });
});

describe('BasemapSerializer.deserialize', () => {
  it('should deserialize a valid basemap id and set it as activeBasemap', () => {
    const basemap = new Basemap({
      id: 1,
      name: 'OpenStreetMap'
    });
    context.stateManager.state.basemaps[basemap.id] = basemap;
    serializer.brainDeserialize('1');
    const state = context.stateManager.state;
    expect(state.activeBasemap).toBeInstanceOf(Basemap);
    expect(state.activeBasemap.id).toBe(basemap.id);
  });
});
