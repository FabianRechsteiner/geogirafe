import { expect, it, describe } from 'vitest';
import SelectionWindowComponent from './component';
import type { GridDataById } from '../../tools/featuretogriddatabyid';
import OlFeature from 'ol/Feature';

const getFeatures = (): OlFeature[] => {
  return [new OlFeature({ col1: 'value1' }), new OlFeature({ col2: 'value2' }), new OlFeature({ col2: 'value3' })];
};

describe('SelectionWindowComponent', () => {
  it('createWindowFeatures', () => {
    const features = getFeatures();
    const sample: GridDataById = {
      foo: {
        columns: [],
        data: [],
        features: [features[0]],
        notOlProperties: [{ col1: 'value1' }]
      },
      bar: {
        columns: [],
        data: [],
        features: [features[1], features[2]],
        notOlProperties: [{ col2: 'value2' }, { col3: 'value3' }]
      }
    };

    expect(SelectionWindowComponent.createWindowFeatures(sample)).toEqual([
      { id: 'foo', feature: sample['foo'].features[0], notOlProperties: sample['foo'].notOlProperties[0] },
      { id: 'bar', feature: sample['bar'].features[0], notOlProperties: sample['bar'].notOlProperties[0] },
      { id: 'bar', feature: sample['bar'].features[1], notOlProperties: sample['bar'].notOlProperties[1] }
    ]);
  });
});
