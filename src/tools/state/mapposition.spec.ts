import { describe, it, expect, beforeEach } from 'vitest';
import MapPosition from './mapposition';

describe('MapPosition', () => {
  let mapPosition: MapPosition;

  beforeEach(() => {
    mapPosition = new MapPosition();
  });

  it('should initialize with default values', () => {
    expect(mapPosition.center).toEqual([]);
    expect(mapPosition.zoom).toBe(0);
    expect(mapPosition.resolution).toBe(100);
    expect(mapPosition.scale).toBe(0);
    expect(mapPosition.crosshair).toBe(false);
    expect(mapPosition.tooltip).toBeUndefined();
  });

  describe('isValid', () => {
    it('should return false if resolution is NaN', () => {
      mapPosition.resolution = NaN;
      expect(mapPosition.isValid).toBe(false);
    });

    it('should return false if center coordinates are missing', () => {
      mapPosition.center = [];
      expect(mapPosition.isValid).toBe(false);

      mapPosition.center = [0];
      expect(mapPosition.isValid).toBe(false);

      mapPosition.center = [NaN, NaN];
      expect(mapPosition.isValid).toBe(false);
    });

    it('should return false if center coordinates are NaN', () => {
      mapPosition.center = [NaN, 10];
      expect(mapPosition.isValid).toBe(false);

      mapPosition.center = [10, NaN];
      expect(mapPosition.isValid).toBe(false);
    });

    it('should return true for valid center coordinates and resolution', () => {
      mapPosition.center = [10, 20];
      mapPosition.resolution = 50;
      expect(mapPosition.isValid).toBe(true);
    });
  });
});
