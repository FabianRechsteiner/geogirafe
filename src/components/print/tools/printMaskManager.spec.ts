// SPDX-License-Identifier: Apache-2.0
import PrintMaskManager from './printMaskManager';
import { Size } from 'ol/size';
import { describe, expect, it } from 'vitest';

describe('PrintMaskManager Class', () => {
  it('tests getOptimalResolution method', () => {
    let mapSize: Size = [600, 400];
    let printMapSize: number[] = [600, 400]; // landscape layout
    let scale = 10000;
    let result = PrintMaskManager.getOptimalResolution(mapSize, printMapSize, scale);
    expect(result).toBeCloseTo(3.5, 1);

    scale = 100; // 100x smaller extent
    result = PrintMaskManager.getOptimalResolution(mapSize, printMapSize, scale);
    expect(result).toBeCloseTo(0.035, 3); //rounded up to two decimal places

    mapSize = [600, 400];
    printMapSize = [400, 600]; // Portrait layout
    scale = 10000;
    result = PrintMaskManager.getOptimalResolution(mapSize, printMapSize, scale);
    expect(result).toBeCloseTo(5.3, 1); //rounded up to two decimal places
  });

  it('tests getOptimalScale method', () => {
    const mapScales: number[] = [100, 1000, 2500, 5000, 10000, 25000, 50000];
    const mapSize: Size = [600, 400];
    let printMapSize: number[] = [600, 400]; // landscape layout
    let mapResolution = 1;
    let result = PrintMaskManager.getOptimalScale(mapSize, mapResolution, printMapSize, mapScales);
    expect(result).toBe(2500);

    mapResolution = 10; // X10 resolution
    result = PrintMaskManager.getOptimalScale(mapSize, mapResolution, printMapSize, mapScales);
    expect(result).toBe(25000);

    printMapSize = [400, 600]; // Portrait layout
    mapResolution = 10;
    result = PrintMaskManager.getOptimalScale(mapSize, mapResolution, printMapSize, mapScales);
    expect(result).toBe(10000);
  });
});
