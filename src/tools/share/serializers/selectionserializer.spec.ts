// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import MockHelper from '../../tests/mockhelper';
import ObjectSelection from '../../state/objectselection';
import SelectionSerializer from './selectionserializer';
import SelectionParam from '../../../models/selectionparam';
import { mockOgcServers } from '../../tests/wmswfsmanagermocking';
import WfsFilter from '../../wfs/wfsfilter';
import LayerWms from '../../../models/layers/layerwms';
import IGirafeContext from '../../context/icontext';

let serializer: SelectionSerializer;
let context: IGirafeContext;

beforeAll(() => {
  context = MockHelper.startMocking();
  serializer = new SelectionSerializer(context);
});

afterAll(() => {
  MockHelper.stopMocking(context);
});

beforeEach(() => {
  const state = context.stateManager.state;
  state.selection = new ObjectSelection();
});

describe('SelectionSerializer.serialize', () => {
  it('should serialize selection box of first parameter', () => {
    const selection = new ObjectSelection();
    selection.selectionParameters.push(
      new SelectionParam(mockOgcServers['QGIS-1-has-wfs'], [], 'EPSG:2056', [10, 20, 30, 40])
    );
    const serialized = serializer.brainSerialize(selection);
    expect(serialized).toBe(JSON.stringify({ selectionBox: [10, 20, 30, 40], selectionQuery: undefined }));
  });

  it('should serialize selection query of first parameter', () => {
    const selection = new ObjectSelection();
    const mockLayer = new LayerWms(1, 'testWms', 1, mockOgcServers['QGIS-1-has-wfs'], {});
    const mockQuery = new WfsFilter('attrName', 'eq', '42');
    selection.selectionParameters.push(
      new SelectionParam(mockOgcServers['QGIS-1-has-wfs'], [mockLayer], 'EPSG:2056', undefined, undefined, [mockQuery])
    );
    const serialized = serializer.brainSerialize(selection);
    expect(serialized).toBe(
      JSON.stringify({
        selectionBox: undefined,
        selectionQuery: {
          query: [{ property: 'attrName', operator: 'eq', value: '42', value2: '' }],
          layerName: 'testWms'
        }
      })
    );
  });

  it('should return empty string if no selection parameters (and default SelectionMode)', () => {
    const selection = new ObjectSelection();
    const serialized = serializer.brainSerialize(selection);
    expect(serialized).toBe('');
  });
});

describe('SelectionSerializer.deserialize', () => {
  it('should set initialSelectionBox from JSON string', () => {
    const json = JSON.stringify({ selectionBox: [100, 200, 300, 400], selectionQuery: undefined });
    serializer.brainDeserialize(json);
    const state = context.stateManager.state;
    expect(state.selection.initialSelectionBox).toEqual([100, 200, 300, 400]);
    expect(state.selection.initialSelectionQuery).toEqual(undefined);
  });

  it('should set initialSelectionQuery from JSON string', () => {
    const json = JSON.stringify({
      selectionBox: [100, 200, 300, 400],
      selectionQuery: { query: [{ property: 'attrName', value: '13', operator: 'eq' }], layerName: 'testWms2' }
    });
    serializer.brainDeserialize(json);
    const state = context.stateManager.state;
    expect(state.selection.initialSelectionBox).toEqual(undefined);
    expect(state.selection.initialSelectionQuery).toEqual({
      query: [new WfsFilter('attrName', 'eq', '13')],
      layerName: 'testWms2'
    });
  });

  it('should do nothing when given an empty string', () => {
    const state = context.stateManager.state;
    state.selection.initialSelectionBox = undefined;

    serializer.brainDeserialize('');
    expect(state.selection.initialSelectionBox).toBeUndefined();
  });
});
