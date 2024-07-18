import { test, expect, describe, beforeEach } from 'vitest';
import FeatureToGridDataById from './featuretogriddatabyid';
import type { FeatureToGridDataOptions, GridDataById, GridData } from './featuretogriddatabyid';
import OlFeature from 'ol/Feature';

let featureToGridDataById: FeatureToGridDataById;
let features: OlFeature[];

const getFeatures = (): OlFeature[] => {
  const fts = [
    new OlFeature({ col1: 'value1', col2: 'value2' }),
    new OlFeature({ col1: undefined, col2: 'value4', col3: undefined }),
    new OlFeature({ col1: 'value7', col2: 'value8' }),
    new OlFeature({ col1: 'value5', col2: 'value6', col3: undefined })
  ];
  fts[0].setId('f.oo.1');
  fts[1].setId('bar.23');
  // features[2] doesn't have id.
  fts[3].setId('bar.45');
  return fts;
};

describe('FeatureToGridDataById', () => {
  beforeEach(() => {
    features = getFeatures();
  });

  test('FeatureToGridDataById class should correctly initialize with given options', () => {
    const options: FeatureToGridDataOptions = {
      removeEmptyColumns: false
    };
    featureToGridDataById = new FeatureToGridDataById(options);
    expect(featureToGridDataById.options.keepGeomProperty).toEqual(false);
    expect(featureToGridDataById.options.removeEmptyColumns).toEqual(false);
  });

  test('toGridDataById', () => {
    featureToGridDataById = new FeatureToGridDataById({ removeEmptyColumns: false });
    const gridDataById: GridDataById = featureToGridDataById.toGridDataById(features);
    expect(gridDataById['f.oo']).toStrictEqual({
      columns: ['col1', 'col2'],
      data: [['value1', 'value2']],
      features: [features[0]],
      notOlProperties: [{ col1: 'value1', col2: 'value2' }]
    });
    expect(gridDataById['bar']).toStrictEqual({
      columns: ['col1', 'col2', 'col3'],
      data: [
        [undefined, 'value4', undefined],
        ['value5', 'value6', undefined]
      ],
      features: [features[1], features[3]],
      notOlProperties: [
        { col1: undefined, col2: 'value4', col3: undefined },
        { col1: 'value5', col2: 'value6', col3: undefined }
      ]
    });
    expect(gridDataById['UNKNOWN']).toStrictEqual({
      columns: ['col1', 'col2'],
      data: [['value7', 'value8']],
      features: [features[2]],
      notOlProperties: [{ col1: 'value7', col2: 'value8' }]
    });
  });

  test('toGridDataById with not normal data', () => {
    featureToGridDataById = new FeatureToGridDataById({ removeEmptyColumns: false });
    const irregularFeature = new OlFeature({ col1: undefined, wrong: 'bad', x: 1, y: 2 });
    irregularFeature.setId('bar');
    // Add a "bar" feature with not the same properties;
    features.push(irregularFeature);
    const gridDataById: GridDataById = featureToGridDataById.toGridDataById(features);
    expect(gridDataById['bar']).toStrictEqual({
      columns: ['col1', 'col2', 'col3'],
      data: [
        [undefined, 'value4', undefined],
        ['value5', 'value6', undefined],
        [undefined, undefined, undefined]
      ],
      features: [features[1], features[3], irregularFeature],
      notOlProperties: [
        { col1: undefined, col2: 'value4', col3: undefined },
        { col1: 'value5', col2: 'value6', col3: undefined },
        { col1: undefined, wrong: 'bad', x: 1, y: 2 }
      ]
    });
  });

  test('toGridDataById with some features without data', () => {
    featureToGridDataById = new FeatureToGridDataById({ removeEmptyColumns: false });
    const withEmptyFeatures = [new OlFeature({ col1: 'value1' }), new OlFeature({}), new OlFeature({})];
    withEmptyFeatures[0].setId('foo');
    withEmptyFeatures[1].setId('foo');
    withEmptyFeatures[2].setId('bar');
    const gridDataById: GridDataById = featureToGridDataById.toGridDataById(withEmptyFeatures);
    expect(gridDataById['foo']).toStrictEqual({
      columns: ['col1'],
      data: [['value1']],
      features: [withEmptyFeatures[0]],
      notOlProperties: [{ col1: 'value1' }]
    });
    expect(gridDataById['bar']).toBeUndefined();
  });

  test('createGridDataWithColumns', () => {
    const gridData: GridData = FeatureToGridDataById.createGridDataWithColumns(features[0].getProperties());
    expect(gridData.columns).toEqual(['col1', 'col2']);
    expect(gridData.data).toEqual([]);
    expect(gridData.features).toEqual([]);
    expect(gridData.notOlProperties).toEqual([]);
  });

  test('removeEmptyColumns', () => {
    featureToGridDataById = new FeatureToGridDataById({});
    const gridDataById: GridDataById = featureToGridDataById.toGridDataById(features);
    const testGridData = gridDataById['bar'];
    FeatureToGridDataById.removeEmptyColumns(testGridData);
    expect(testGridData.columns).toEqual(['col1', 'col2']);
    expect(testGridData.data).toEqual([
      [undefined, 'value4'],
      ['value5', 'value6']
    ]);
  });

  test('findEmptyColumnIndexOf', () => {
    const data: unknown[][] = [
      ['value1', 'value2', undefined, 'value4'],
      [], // considered as all undefined.
      [undefined, 'value6', undefined, 'value8'],
      ['value9', 'value10', undefined, 'value12']
    ];
    const emptyColumnIndices = FeatureToGridDataById.findEmptyColumnIndexOf(data);
    expect(emptyColumnIndices).toStrictEqual([2]);
  });

  test('getUserFeatureType', () => {
    let id = FeatureToGridDataById.getUserFeatureType(features[0]);
    expect(id).toEqual('f.oo');

    id = FeatureToGridDataById.getUserFeatureType(features[1]);
    expect(id).toEqual('bar');

    id = FeatureToGridDataById.getUserFeatureType(features[2]);
    expect(id).toEqual('UNKNOWN');
  });
});
