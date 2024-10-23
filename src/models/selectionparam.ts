import LayerWms from './layers/layerwms';
import ServerOgc from './serverogc';
import type OLayerImage from 'ol/layer/Image';
import type OSourceImageWMS from 'ol/source/ImageWMS';

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
  _oLayer?: OLayerImage<OSourceImageWMS>;
  selectionBox: number[];
  srid: string;

  constructor(
    ogcServer: ServerOgc,
    layers: LayerWms[],
    selectionBox: number[],
    srid: string,
    _oLayer?: OLayerImage<OSourceImageWMS>
  ) {
    this._ogcServer = ogcServer;
    this._layers = layers;
    this.selectionBox = selectionBox;
    this.srid = srid;
    this._oLayer = _oLayer;

    sameUrlAndImageTypeForAll(this._layers);
  }

  clone(layerFilter: (l: LayerWms) => boolean = () => true): SelectionParam {
    return new SelectionParam(
      this._ogcServer,
      this._layers.filter(layerFilter),
      this.selectionBox,
      this.srid,
      this._oLayer
    );
  }
}
