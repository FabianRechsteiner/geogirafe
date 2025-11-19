import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import GlobeSerializer from './globeserializer';
import MockHelper from '../../tests/mockhelper';
import IGirafeContext from '../../context/icontext';
import GlobeState from '../../state/globe';

let serializer: GlobeSerializer;
let context: IGirafeContext;

beforeAll(() => {
  context = MockHelper.startMocking();
  serializer = new GlobeSerializer(context);
});

afterAll(() => {
  MockHelper.stopMocking(context);
});

describe('GlobeSerializer', () => {
  it('serializes the current globe state without runtime flags', () => {
    const globe = new GlobeState();
    globe.display = '2D/3D';
    globe.loaded = true;
    globe.shadows = true;
    globe.shadowsTimestamp = 42;
    globe.camera = { heading: 1, pitch: 2, roll: 3 };

    const serialized = serializer.brainSerialize(globe);
    expect(JSON.parse(serialized)).toEqual({
      display: '2D/3D',
      shadows: true,
      shadowsTimestamp: 42,
      camera: { heading: 1, pitch: 2, roll: 3 }
    });
  });

  it('deserializes into the existing globe state instance and resets runtime flags', () => {
    const data = {
      display: '3D',
      shadows: false,
      shadowsTimestamp: 1234,
      camera: { heading: 4, pitch: 5, roll: 6 }
    };

    const existingGlobe = context.stateManager.state.globe;
    serializer.brainDeserialize(JSON.stringify(data));

    expect(context.stateManager.state.globe).toBe(existingGlobe);
    expect(context.stateManager.state.globe).toEqual({
      ...data,
      loaded: false
    });
  });
});
