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
    expect(serialized).toEqual('[{"id":1,"name":"OpenStreetMap","opacity":-1}]');
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
    serializer.brainDeserialize('[{"id":1,"name":"OpenStreetMap","opacity":-1}]');
    const state = context.stateManager.state;
    expect(state.activeBasemaps).toBeInstanceOf(Array<Basemap>);
    expect(state.activeBasemaps[0].id).toBe(basemaps[0].id);
    expect(state.activeBasemaps[0].opacity).toBe(-1);
    expect(state.activeBasemaps[0].opacityDisabled).toBeTruthy();
  });

  it('should deserialize a valid basemap even if another one cannot be found', () => {
    const basemaps = [
      new Basemap({
        id: 1,
        name: 'OpenStreetMap'
      })
    ];
    basemaps.forEach((basemap) => {
      context.stateManager.state.basemaps[basemap.id] = basemap;
    });
    serializer.brainDeserialize(
      '[{"id":1,"name":"OpenStreetMap","opacity":-1},{"id":2,"name":"NotExisting","opacity":0.5}]'
    );
    const state = context.stateManager.state;
    expect(state.activeBasemaps).toBeInstanceOf(Array<Basemap>);
    expect(state.activeBasemaps[0].id).toBe(basemaps[0].id);
    expect(state.activeBasemaps[0].opacity).toBe(-1);
    expect(state.activeBasemaps[0].opacityDisabled).toBeTruthy();
  });

  it('should deserialize a valid basemap with the right opacity', () => {
    const basemaps = [
      new Basemap({
        id: 1,
        name: 'OpenStreetMap'
      })
    ];
    basemaps.forEach((basemap) => {
      context.stateManager.state.basemaps[basemap.id] = basemap;
    });
    serializer.brainDeserialize('[{"id":1,"name":"OpenStreetMap","opacity":0.45}]');
    const state = context.stateManager.state;
    expect(state.activeBasemaps).toBeInstanceOf(Array<Basemap>);
    expect(state.activeBasemaps[0].id).toBe(basemaps[0].id);
    expect(state.activeBasemaps[0].opacity).toBe(0.45);
    expect(state.activeBasemaps[0].opacityDisabled).toBeFalsy();
  });
});

describe('ActiveBasemapsSerializer.deserialize (preferNames)', () => {
  beforeAll(() => {
    context.configManager.Config.share!.preferNames = true;
  });

  afterAll(() => {
    context.configManager.Config.share!.preferNames = false;
  });

  it('should deserialize a valid basemap id and set it as activeBasemap (preferNames)', () => {
    const basemaps = [
      new Basemap({
        id: 1,
        name: 'OpenStreetMap'
      })
    ];
    basemaps.forEach((basemap) => {
      context.stateManager.state.basemaps[basemap.id] = basemap;
    });
    serializer.brainDeserialize('[{"id":999,"name":"OpenStreetMap","opacity":-1}]');
    const state = context.stateManager.state;
    expect(state.activeBasemaps).toBeInstanceOf(Array<Basemap>);
    expect(state.activeBasemaps[0].id).toBe(basemaps[0].id);
    expect(state.activeBasemaps[0].opacity).toBe(-1);
    expect(state.activeBasemaps[0].opacityDisabled).toBeTruthy();
  });

  it('should deserialize a valid basemap even if another one cannot be found (preferNames)', () => {
    const basemaps = [
      new Basemap({
        id: 1,
        name: 'OpenStreetMap'
      })
    ];
    basemaps.forEach((basemap) => {
      context.stateManager.state.basemaps[basemap.id] = basemap;
    });
    serializer.brainDeserialize(
      '[{"id":999,"name":"OpenStreetMap","opacity":-1},{"id":888,"name":"NotExisting","opacity":0.5}]'
    );
    const state = context.stateManager.state;
    expect(state.activeBasemaps).toBeInstanceOf(Array<Basemap>);
    expect(state.activeBasemaps[0].id).toBe(basemaps[0].id);
    expect(state.activeBasemaps[0].opacity).toBe(-1);
    expect(state.activeBasemaps[0].opacityDisabled).toBeTruthy();
  });

  it('should deserialize a valid basemap with the right opacity (preferNames)', () => {
    const basemaps = [
      new Basemap({
        id: 1,
        name: 'OpenStreetMap'
      })
    ];
    basemaps.forEach((basemap) => {
      context.stateManager.state.basemaps[basemap.id] = basemap;
    });
    serializer.brainDeserialize('[{"id":999,"name":"OpenStreetMap","opacity":0.45}]');
    const state = context.stateManager.state;
    expect(state.activeBasemaps).toBeInstanceOf(Array<Basemap>);
    expect(state.activeBasemaps[0].id).toBe(basemaps[0].id);
    expect(state.activeBasemaps[0].opacity).toBe(0.45);
    expect(state.activeBasemaps[0].opacityDisabled).toBeFalsy();
  });
});
