import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import LayersConfigSerializer from './layerconfigserializer';
import MockHelper from '../../tests/mockhelper';
import ThemeLayer from '../../../models/layers/themelayer';
import GroupLayer from '../../../models/layers/grouplayer';
import LayersConfig from '../../state/layersConfig';
import LayerWmts from '../../../models/layers/layerwmts';
import IGirafeContext from '../../context/icontext';

let serializer: LayersConfigSerializer;
let context: IGirafeContext;

beforeAll(() => {
  context = MockHelper.startMocking();
  serializer = new LayersConfigSerializer(context);
});

afterAll(() => {
  MockHelper.stopMocking(context);
});

beforeEach(() => {
  context.stateManager.state.themes._allThemes = {};
  context.stateManager.state.layers.layersList = [];
});

function getTestData(options: { [key: string]: any } = {}) {
  const layersConfig = new LayersConfig();
  const theme = new ThemeLayer(1, 'test-theme', 0);
  const groupLayer = new GroupLayer(11, 'Group 1', 11);
  theme.children.push(groupLayer);
  context.stateManager.state.themes._allThemes[theme.id] = theme;

  if (options.addSecondMissingGroup) {
    const groupLayer2 = new GroupLayer(12, 'Group 2', 12);
    theme.children.push(groupLayer2);
  }

  if (options.addWmtsLayer) {
    const wmtsLayer = new LayerWmts(21, 'Layer WMTS 1', 21, 'https://test.url/', 'test_layer');
    groupLayer.children.push(wmtsLayer);
  }
  if (options.addSecondMissingLayer) {
    const wmtsLayer = new LayerWmts(22, 'Layer WMTS 2', 22, 'https://test2.url/', 'test_layer_2');
    groupLayer.children.push(wmtsLayer);
  }

  // Clone the object to be able to work on it without change the default object stored in the themes
  const clone = theme.clone();
  layersConfig.layersList.push(clone);

  if (options.isGroupExpanded) {
    (clone.children[0] as GroupLayer).isExpanded = options.isGroupExpanded;
  }
  if (options.isGroupChecked) {
    (clone.children[0] as GroupLayer).activeState = 'on';
  }
  if (options.addSecondMissingGroup) {
    clone.children.splice(1, 1);
  }
  if (options.addSecondMissingLayer) {
    (clone.children[0] as GroupLayer).children.splice(1, 1);
  }
  if (options.opacity) {
    ((clone.children[0] as GroupLayer).children[0] as LayerWmts).opacity = options.opacity;
  }
  if (options.swiped) {
    ((clone.children[0] as GroupLayer).children[0] as LayerWmts).swiped = options.swiped;
  }

  const controlValue = [
    {
      id: 1,
      order: 0,
      checked: 0,
      isExpanded: 1,
      children: [
        {
          id: 11,
          order: 11,
          checked: options.isGroupChecked ? 1 : 0,
          isExpanded: options.isGroupExpanded ? 1 : 0,
          children: [] as unknown[],
          excludedChildrenIds: options.addSecondMissingLayer ? [22] : []
        }
      ],
      excludedChildrenIds: options.addSecondMissingGroup ? [12] : []
    }
  ];

  if (options.addWmtsLayer) {
    controlValue[0].children[0].children.push({
      id: 21,
      order: 21,
      checked: 0,
      isExpanded: 0,
      opacity: options.opacity ?? 1,
      swiped: options.swiped ?? 'no',
      children: [],
      excludedChildrenIds: []
    });
  }

  return {
    layersConfig: layersConfig,
    controlValue: JSON.stringify(controlValue)
  };
}

describe('LayersConfigSerializer.serialize', () => {
  it('should return serialized data for a GroupLayer (id, order)', () => {
    const data = getTestData();
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer (isExpanded)', () => {
    const data = getTestData({ isGroupExpanded: true });
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer (isChecked)', () => {
    const data = getTestData({ isGroupChecked: true });
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer with children', () => {
    const data = getTestData({ addWmtsLayer: true });
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer with children (opacity)', () => {
    const data = getTestData({ addWmtsLayer: true, opacity: 0.5 });
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer with children (swiped left)', () => {
    const data = getTestData({ addWmtsLayer: true, swiped: 'left' });
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer with children (swiped right)', () => {
    const data = getTestData({ addWmtsLayer: true, swiped: 'left' });
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should serialize a missing original group correctly (explicitely removed)', () => {
    const data = getTestData({ addSecondMissingGroup: true });
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should serialize a missing original layer correctly (explicitely removed)', () => {
    const data = getTestData({ addWmtsLayer: true, addSecondMissingLayer: true });
    const serialized = serializer.brainSerialize(data.layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });
});

describe('LayersConfigSerializer.deserialize', () => {
  it('should return serialized data for a GroupLayer (id, order)', () => {
    const data = getTestData();
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer (isExpanded)', () => {
    const data = getTestData({ isGroupExpanded: true });
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  // TODO REG : This Test still has an eror with the active state (isChecked) for ThemeLayer
  /*it('should return serialized data for a GroupLayer (isChecked)', () => {
    const data = getTestData({isGroupChecked: true});
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });*/

  it('should return serialized data for a GroupLayer with children', () => {
    const data = getTestData({ addWmtsLayer: true });
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer with children (opacity)', () => {
    const data = getTestData({ addWmtsLayer: true, opacity: 0.5 });
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer with children (swiped left)', () => {
    const data = getTestData({ addWmtsLayer: true, swiped: 'left' });
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should return serialized data for a GroupLayer with children (swiped right)', () => {
    const data = getTestData({ addWmtsLayer: true, swiped: 'left' });
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should serialize a missing original group correctly (explicitely removed)', () => {
    const data = getTestData({ addSecondMissingGroup: true });
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });

  it('should serialize a missing original layer correctly (explicitely removed)', () => {
    const data = getTestData({ addWmtsLayer: true, addSecondMissingLayer: true });
    serializer.brainDeserialize(data.controlValue);
    const layersConfig = context.stateManager.state.layers;
    const serialized = serializer.brainSerialize(layersConfig);
    expect(serialized).toEqual(data.controlValue);
  });
});
