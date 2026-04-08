// SPDX-License-Identifier: Apache-2.0
import { MapContextMenuState } from './contextmenustate';
import { GeoTIFFImage } from 'geotiff';
import { GeoTransform, getPixelValue, getImage, extractGeoTransform } from '../../../tools/raster/rasterutils';
import proj4 from 'proj4';
import IGirafeContext from '../../../tools/context/icontext';

interface Raster {
  id: string;
  url: string;
  type: 'COG' | 'API';
  crs: string;
  label: string;
  transform: GeoTransform | null;
  image: GeoTIFFImage | null;
  pixelvalue: number | null;
  pixelstring: string | null;
  prefix: string;
  suffix: string;
  precision: number;
  nodata: number;
}

export default class MapContextMenuManager {
  private readonly mapContextMenuState: MapContextMenuState;
  private readonly context: IGirafeContext;
  private _position!: [number, number];
  private readonly rasters: Raster[] = [];
  public projection: string | null = null;

  public constructor(mapContextMenuState: MapContextMenuState, context: IGirafeContext) {
    this.mapContextMenuState = mapContextMenuState;
    this.context = context;
  }

  public get position(): [number, number] {
    return this._position;
  }

  public set position(value: [number, number]) {
    this._position = value;
    this.updateCoordinates();
    this.updateRasterSamples();
    this.updateLinks();
  }

  public async initialize() {
    const config = this.context.configManager.Config.contextmenu;
    if (!config) {
      throw new Error('Context menu configuration is missing.');
    }

    // Initialize positions
    for (const el of config.crs) {
      const crs = {
        code: el.code,
        translation: el.translation,
        format: el.format,
        precision: el.precision,
        coordinate: [0, 0] as [number, number]
      };
      this.mapContextMenuState.crs.push(crs);
    }

    // Initialize links
    for (const el of config.links) {
      const link = {
        translation: el.translation,
        crs: el.crs,
        url: el.url,
        content: ''
      };
      this.mapContextMenuState.links.push(link);
    }

    // Initialize raster sources
    for (const el of config.sources) {
      const raster: Raster = {
        id: el.id,
        url: el.url,
        type: 'COG',
        crs: el.crs,
        label: el.translation,
        image: null,
        transform: null,
        pixelvalue: null,
        pixelstring: null,
        prefix: el.prefix,
        suffix: el.suffix,
        precision: el.precision,
        nodata: el.nodata
      };
      this.rasters.push(raster);
      this.mapContextMenuState.sources.push({
        id: el.id,
        url: el.url,
        crs: el.crs,
        translation: el.translation,
        content: null,
        loading: true
      });

      try {
        const image = await getImage(el.url);
        const transform = await extractGeoTransform(image);
        raster.image = image;
        raster.transform = transform;
      } catch (err) {
        console.error(`Failed to load raster ${el.id}:`, err);
      }
    }
  }

  private getCoordinate(code: string): [number, number] | null {
    const entry = this.mapContextMenuState.crs.find((c) => c.code === code);
    return entry ? entry.coordinate : null;
  }

  private updateCoordinates(): void {
    this.mapContextMenuState.projection = this.projection;
    this.mapContextMenuState.position = this.position;
    for (const src of this.mapContextMenuState.crs) {
      src.coordinate = proj4(this.projection!, src.code, this._position) as [number, number];
    }
  }

  private updateLinks(): void {
    for (const link of this.mapContextMenuState.links) {
      const coord = this.getCoordinate(link.crs);
      if (coord && typeof link.url === 'string' && link.url.includes('###MAPX###') && link.url.includes('###MAPY###')) {
        const [x, y] = coord;
        link.content = link.url.replace(/###MAPX###/g, x.toString()).replace(/###MAPY###/g, y.toString());
      } else {
        link.content = null;
      }
    }
  }

  private resetRasters(): void {
    for (const el of this.rasters) {
      el.pixelvalue = null;
      el.pixelstring = null;
    }

    for (const src of this.mapContextMenuState.sources) {
      src.content = this.context.i18nManager.getTranslation('Loading');
      src.loading = true;
    }
  }

  private async updateRasterSamples() {
    this.resetRasters();
    for (const raster of this.rasters) {
      if (!raster.image || !raster.transform) return;

      try {
        const [mx, my] = proj4(this.projection!, raster.crs, this.position);
        const val = await getPixelValue(raster.image, raster.transform, [mx, my]);

        raster.pixelvalue = val;
        if (val == null || val == raster.nodata) {
          raster.pixelstring = null;
        } else {
          raster.pixelstring = `${raster.prefix}${val.toFixed(raster.precision)}${raster.suffix}`;
        }

        const entry = this.mapContextMenuState.sources.find((s) => s.id === raster.id);
        if (entry) {
          entry.content = raster.pixelstring;
          entry.loading = false;
        }
      } catch (err) {
        console.warn(`Failed to query raster source: ${raster.url}:`, err);
      }
    }
  }
}
