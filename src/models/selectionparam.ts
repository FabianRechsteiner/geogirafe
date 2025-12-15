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
 * - a selection box OR a WFS query
 */
export default class SelectionParam {
  private readonly _ogcServer: ServerOgc;
  public get ogcServer() {
    return this._ogcServer;
  }

  private readonly _layers: LayerWms[];
  public get layers() {
    return this._layers;
  }

  private readonly _oLayer?: OLayerImage<OSourceImageWMS>;
  public get oLayer() {
    return this._oLayer;
  }

  public readonly srid: string;
  public readonly selectionBox?: number[];
  public readonly selectionQuery?: WfsFilter[];

  public constructor(
    ogcServer: ServerOgc,
    layers: LayerWms[],
    srid: string,
    selectionBox?: number[],
    oLayer?: OLayerImage<OSourceImageWMS>,
    selectionQuery?: WfsFilter[]
  ) {
    this._ogcServer = ogcServer;
    this._layers = layers;
    this.srid = srid;
    this.selectionBox = selectionBox;
    this._oLayer = oLayer;
    this.selectionQuery = selectionQuery;

    if (!this.selectionBox && !this.selectionQuery) {
      throw new Error('SelectionParam needs either a `selectionBox` or a `selectionQuery` parameter.');
    }

    sameUrlAndImageTypeForAll(this.layers);
  }

  public clone(layerFilter: (l: LayerWms) => boolean = () => true): SelectionParam {
    return new SelectionParam(
      this._ogcServer,
      this._layers.filter(layerFilter),
      this.srid,
      this.selectionBox,
      this._oLayer,
      this.selectionQuery
    );
  }
}
