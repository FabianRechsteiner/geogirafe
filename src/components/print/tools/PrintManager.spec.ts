import { expect, it, describe, beforeEach, afterAll } from 'vitest';
import PrintManager from './PrintManager';
import MockHelper from '../../../tools/tests/mockhelper';
import { I18nManager } from '../../../tools/main';
import { createPointFeature } from '../../../tools/tests/olhelpers';

describe('PrintManager', () => {
  beforeEach(() => {
    MockHelper.startMocking();
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  describe('getPrintDatasourceFromSelectedFeatures', () => {
    const extent = [0, 0, 1000, 1000];
    // Ten points from [0, 0] to [0, 2000] => we will keep 6 regarding the extent
    const selectedFeatures = [...Array(10)].map((_, index: number) => {
      const point = createPointFeature();
      point.getGeometry()?.setCoordinates([0, 200 * index]);
      const id = index % 2 ? 'vegetationB.1234' : 'vegetationA.5678';
      point.setId(id);
      point.set('tree', 'oak');
      return point;
    });

    it('should format the data source for printing based on selected features filtered by the given extent', () => {
      const result = PrintManager.getPrintDatasourceFromSelectedFeatures(
        selectedFeatures,
        extent,
        I18nManager.getInstance()
      );

      expect(result.length).toBe(2);
      expect(result[0].title).toEqual('vegetationA');
      expect(result[1].title).toEqual('vegetationB');

      expect(result[0].table.columns.length).toBe(2);
      expect(result[0].table.columns).toEqual(['name', 'tree']);
      expect(result[0].table.data.length).toBe(3);
      expect(result[0].table.data[0]).toEqual(['A test point', 'oak']);

      const keptFeatures = result[0].table.data.length + result[1].table.data.length;
      expect(keptFeatures).toBe(6);
    });
  });
});
