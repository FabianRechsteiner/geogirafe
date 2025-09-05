import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import BasemapSerializer from './basemapserializer';
import StateManager from '../../state/statemanager';
import MockHelper from '../../tests/mockhelper';
import Basemap from '../../../models/basemaps/basemap';
import BasemapEmpty from '../../../models/basemaps/basemapempty';

let serializer: BasemapSerializer;

beforeAll(() => {
  MockHelper.startMocking();
  serializer = new BasemapSerializer();
});

afterAll(() => {
  MockHelper.stopMocking();
});

beforeEach(() => {
  const state = StateManager.getInstance().state;
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
    StateManager.getInstance().state.basemaps[basemap.id] = basemap;
    serializer.brainDeserialize('1');
    const state = StateManager.getInstance().state;
    expect(state.activeBasemap).toBeInstanceOf(Basemap);
    expect(state.activeBasemap.id).toBe(basemap.id);
  });
});
