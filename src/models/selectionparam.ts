import LayerWms from './layers/layerwms';
import ServerOgc from './serverogc';
import type OLayerImage from 'ol/layer/Image';
import type OSourceImageWMS from 'ol/source/ImageWMS';
import WfsFilter from '../tools/wfs/wfsfilter';

function sameUrlAndImageTypeForAll(layers: LayerWms[]) {
  if (layers.length === 0) {
    return [true, true];
  }
  const url = layers[0].ogcServer.url;
  const imageType = layers[0].ogcServer.imageType;
  let sameUrlForAll = true;
  let sameImageTypeForAll = true;
  for (const layer of layers) {
    sameUrlForAll = sameUrlForAll && layer.ogcServer.url === url;
    sameImageTypeForAll = sameImageTypeForAll && layer.ogcServer.imageType === imageType;
  }

  if (!sameUrlForAll) {
    throw new Error('Not all layers of this list have the same server URL.');
  }
  if (!sameImageTypeForAll) {
    throw new Error('Not all layers of this list have the same image type.');
  }

  return [sameUrlForAll, sameImageTypeForAll];
}

/** Selection parameters defined by:
 * - 1 ogc Sever
 * - a list of layers
 * - a selection box
 */
export default class SelectionParam {
  _ogcServer: ServerOgc;
  _layers: LayerWms[];
  srid: string;
  selectionBox?: number[];
  _oLayer?: OLayerImage<OSourceImageWMS>;
  queries?: WfsFilter[];

  constructor(
    ogcServer: ServerOgc,
    layers: LayerWms[],
    srid: string,
    selectionBox?: number[],
    _oLayer?: OLayerImage<OSourceImageWMS>,
    queries?: WfsFilter[]
  ) {
    this._ogcServer = ogcServer;
    this._layers = layers;
    this.srid = srid;
    this.selectionBox = selectionBox;
    this._oLayer = _oLayer;
    this.queries = queries;

    sameUrlAndImageTypeForAll(this._layers);
  }

  clone(layerFilter: (l: LayerWms) => boolean = () => true): SelectionParam {
    return new SelectionParam(
      this._ogcServer,
      this._layers.filter(layerFilter),
      this.srid,
      this.selectionBox,
      this._oLayer,
      this.queries
    );
  }
}
