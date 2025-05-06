import StateManager from '../../tools/state/statemanager';
import ConfigManager from '../../tools/configuration/configmanager';
import { MapContextMenuState } from './contextmenustate';
import { GeoTIFFImage } from 'geotiff';
import { GeoTransform, getPixelValue, getImage, extractGeoTransform } from '../../tools/raster/rasterutils';
import proj4 from 'proj4';

interface RasterSource {
  id: string;
  translation: string;
  prefix: string;
  suffix: string;
  precision: number;
  crs: string;
  url: string;
}

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
}

export class RasterManager {
  private readonly MapContextMenuState: MapContextMenuState;
  private readonly sources: RasterSource[];
  public rasters: Raster[];

  constructor() {
    this.MapContextMenuState = StateManager.getInstance().state.extendedState.mapcontextmenu as MapContextMenuState;
    this.sources = ConfigManager.getInstance().Config.contextmenu.sources;
    this.rasters = [];
    this.init();
  }

  private init(): void {
    this.sources.forEach(async (src) => {
      const raster: Raster = {
        id: src.id,
        url: src.url,
        type: 'COG',
        crs: src.crs,
        label: src.translation,
        image: null,
        transform: null,
        pixelvalue: null,
        pixelstring: null,
        prefix: src.prefix,
        suffix: src.suffix,
        precision: src.precision
      };
      this.rasters.push(raster);
      this.MapContextMenuState.sources.push({
        id: src.id,
        url: src.url,
        crs: src.crs,
        translation: src.translation,
        content: null
      });

      try {
        const image = await getImage(src.url);
        const transform = extractGeoTransform(image);
        raster.image = image;
        raster.transform = transform;
      } catch (err) {
        console.error(`Failed to load raster ${src.id}:`, err);
      }
    });
  }

  public reset(): void {
    this.rasters.forEach((el) => {
      el.pixelvalue = null;
      el.pixelstring = null;
    });

    this.MapContextMenuState.sources.forEach((src) => {
      src.content = null;
    });
  }

  public refresh(projection: string, position: [number, number]): void {
    this.reset();

    this.rasters.forEach(async (raster) => {
      if (!raster.image || !raster.transform) return;

      try {
        const [mx, my] = proj4(projection, raster.crs, position);
        const val = await getPixelValue(raster.image, raster.transform, [mx, my]);

        raster.pixelvalue = val;
        raster.pixelstring = val != null ? `${raster.prefix}${val.toFixed(raster.precision)}${raster.suffix}` : null;

        const entry = this.MapContextMenuState.sources.find((s) => s.id === raster.id);
        if (entry) entry.content = raster.pixelstring;
      } catch (err) {
        console.warn(`Failed to query raster source: ${raster.url}:`, err);
      }
    });
  }
}
