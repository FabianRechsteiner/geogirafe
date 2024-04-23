import { GMFMetadata, GMFTreeItem } from '../../models/gmf';
import LayerWms from '../../models/layers/layerwms';
import LayerWmts from '../../models/layers/layerwmts';
import GroupLayer from '../../models/layers/grouplayer';

export const createDefaultMetadata = (options?: Partial<GMFMetadata>): GMFMetadata => {
  return {
    ...{
      isLegendExpanded: false,
      wasLegendExpanded: false,
      exclusiveGroup: false,
      isExpanded: false,
      isChecked: false
    },
    ...options
  };
};

// ============== WMS Layers ================

export interface WmsOptions {
  serverName?: string;
  url?: string;
  urlWfs?: string | null;
  order?: number;
  gmfOptions?: Partial<GMFTreeItem>;
}

export const createTestLayerWms = (options: WmsOptions): LayerWms => {
  const defaultOptions: WmsOptions = {
    order: 1,
    gmfOptions: {
      id: 1,
      name: 'testWms',
      metadata: createDefaultMetadata(),
      childLayers: [
        {
          name: 'testWms',
          queryable: false
        }
      ]
    }
  };

  const opts: WmsOptions = { ...defaultOptions, ...options };
  opts.gmfOptions = { ...defaultOptions.gmfOptions, ...options.gmfOptions };

  const layerWms = new LayerWms(
    <GMFTreeItem>opts.gmfOptions,
    opts.serverName ?? '',
    opts.url ?? '',
    opts.urlWfs ?? '',
    opts.order ?? 1
  );
  layerWms.activeState = 'on';
  return layerWms;
};

// ============== WMTS Layers ================

export interface WmtsOptions {
  order?: number;
  gmfOptions?: Partial<GMFTreeItem>;
}

export const createTestLayerWmts = (options: WmtsOptions): LayerWmts => {
  const defaultOptions: WmtsOptions = {
    order: 1,
    gmfOptions: {
      id: 1,
      name: 'testWmts',
      url: 'https://test.ch',
      layer: 'testWmts',
      metadata: createDefaultMetadata()
    }
  };

  const opts: WmtsOptions = { ...defaultOptions, ...options };
  opts.gmfOptions = { ...defaultOptions.gmfOptions, ...options.gmfOptions };
  const layerWmts = new LayerWmts(<GMFTreeItem>opts.gmfOptions, opts.order ?? 1);
  layerWmts.activeState = 'on';
  return layerWmts;
};

// ============== WMTS Layers ================

export interface GroupOptions {
  gmfOptions?: Partial<GMFTreeItem>;
  order?: number;
}

export const createTestGroupLayer = (options: GroupOptions): GroupLayer => {
  const defaultOptions: GroupOptions = {
    gmfOptions: {
      id: 1,
      name: 'testGroup',
      type: 'group',
      metadata: createDefaultMetadata()
    },
    order: 1
  };

  const opts: GroupOptions = { ...defaultOptions, ...options };
  opts.gmfOptions = { ...defaultOptions.gmfOptions, ...options.gmfOptions };

  return new GroupLayer(<GMFTreeItem>opts.gmfOptions, opts.order ?? 1);
};
