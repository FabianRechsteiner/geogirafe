import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import MapPositionSerializer from './mappositionserializer';
import MapPosition from '../../state/mapposition';
import StateManager from '../../state/statemanager';
import MockHelper from '../../tests/mockhelper';

let serializer: MapPositionSerializer;

beforeAll(() => {
  MockHelper.startMocking();
  serializer = new MapPositionSerializer();
});

afterAll(() => {
  MockHelper.stopMocking();
});

beforeEach(() => {
  const state = StateManager.getInstance().state;
  state.position = new MapPosition(); // reset position before each test
});

describe('MapPositionSerializer.serialize', () => {
  it('should serialize a MapPosition to JSON string', () => {
    const mapPosition = new MapPosition();
    mapPosition.center = [10, 20];
    mapPosition.resolution = 5;
    mapPosition.crosshair = [10, 20];
    mapPosition.tooltip = {
      content: 'Test tooltip',
      position: [10, 20]
    };

    const serialized = serializer.brainSerialize(mapPosition);
    expect(serialized).toBe(
      JSON.stringify({
        center: [10, 20],
        resolution: 5,
        crosshair: [10, 20],
        tooltip: {
          content: 'Test tooltip',
          position: [10, 20]
        }
      })
    );
  });
});

describe('MapPositionSerializer.deserialize', () => {
  it('should deserialize JSON string into StateManager.state.position', () => {
    const json = JSON.stringify({
      center: [50, 60],
      resolution: 2,
      crosshair: [10, 20],
      tooltip: {
        content: 'Test tooltip',
        position: [10, 20]
      }
    });

    serializer.brainDeserialize(json);

    const state = StateManager.getInstance().state;
    expect(state.position).toBeInstanceOf(MapPosition);
    expect(state.position.center).toEqual([50, 60]);
    expect(state.position.resolution).toBe(2);
    expect(state.position.crosshair).toEqual([10, 20]);
    expect(state.position.tooltip).toEqual({
      content: 'Test tooltip',
      position: [10, 20]
    });
  });

  it('should override previous map position in state', () => {
    const state = StateManager.getInstance().state;

    // Set an initial position
    state.position.center = [0, 0];
    state.position.resolution = 10;
    ((state.position.crosshair = [10, 20]),
      (state.position.tooltip = {
        content: 'Initial',
        position: [10, 20]
      }));
    // Deserialize a new one
    const json = JSON.stringify({
      center: [100, 200],
      resolution: 1,
      crosshair: [30, 40],
      tooltip: {
        content: 'Updated',
        position: [50, 60]
      }
    });
    serializer.brainDeserialize(json);

    expect(state.position.center).toEqual([100, 200]);
    expect(state.position.resolution).toBe(1);
    expect(state.position.crosshair).toEqual([30, 40]);
    expect(state.position.tooltip).toEqual({
      content: 'Updated',
      position: [50, 60]
    });
  });
});
