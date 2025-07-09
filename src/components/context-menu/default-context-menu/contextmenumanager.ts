import ConfigManager from '../../../tools/configuration/configmanager';
import I18nManager from '../../../tools/i18n/i18nmanager';
import GirafeConfig from '../../../tools/configuration/girafeconfig';
import { MapContextMenuState } from './contextmenustate';
import { GeoTIFFImage } from 'geotiff';
import { GeoTransform, getPixelValue, getImage, extractGeoTransform } from '../../../tools/raster/rasterutils';
import proj4 from 'proj4';

type ContextmenuConfig = GirafeConfig['contextmenu'];
type CRS = GirafeConfig['contextmenu']['crs'][0];
type Link = GirafeConfig['contextmenu']['links'][0];
type RasterSource = GirafeConfig['contextmenu']['sources'][0];

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

export class MapContextMenuManager {
  private readonly MapContextMenuState: MapContextMenuState;
  private readonly i18nManager: I18nManager;
  private _position!: [number, number];
  projection: string | null = null;
  rasters: Raster[] = [];

  constructor(MapContextMenuState: MapContextMenuState) {
    const config = ConfigManager.getInstance().Config.contextmenu;
    this.i18nManager = I18nManager.getInstance();
    this.MapContextMenuState = MapContextMenuState;
    this.init(config);
  }

  get position(): [number, number] {
    return this._position;
  }

  set position(value: [number, number]) {
    this._position = value;
    this.updateCoordinates();
    this.updateRasterSamples();
    this.updateLinks();
  }

  init(config: ContextmenuConfig) {
    // Initialize positions
    config.crs.forEach((el: CRS) => {
      const crs = {
        code: el.code,
        translation: el.translation,
        format: el.format,
        precision: el.precision,
        coordinate: [0, 0] as [number, number]
      };
      this.MapContextMenuState.crs.push(crs);
    });

    // Initialize links
    config.links.forEach((el: Link) => {
      const link = {
        translation: el.translation,
        crs: el.crs,
        url: el.url,
        content: ''
      };
      this.MapContextMenuState.links.push(link);
    });

    // Initialize raster sources
    config.sources.forEach(async (el: RasterSource) => {
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
      this.MapContextMenuState.sources.push({
        id: el.id,
        url: el.url,
        crs: el.crs,
        translation: el.translation,
        content: null,
        loading: true
      });

      try {
        const image = await getImage(el.url);
        const transform = extractGeoTransform(image);
        raster.image = image;
        raster.transform = transform;
      } catch (err) {
        console.error(`Failed to load raster ${el.id}:`, err);
      }
    });
  }

  getCoordinate(code: string): [number, number] | null {
    const entry = this.MapContextMenuState.crs.find((c) => c.code === code);
    return entry ? entry.coordinate : null;
  }

  updateCoordinates(): void {
    this.MapContextMenuState.projection = this.projection;
    this.MapContextMenuState.position = this.position;
    this.MapContextMenuState.crs.forEach(async (src) => {
      src.coordinate = proj4(this.projection!, src.code, this._position) as [number, number];
    });
  }

  updateLinks(): void {
    for (const link of this.MapContextMenuState.links) {
      const coord = this.getCoordinate(link.crs);
      if (coord && typeof link.url === 'string' && link.url.includes('###MAPX###') && link.url.includes('###MAPY###')) {
        const [x, y] = coord;
        link.content = link.url.replace(/###MAPX###/g, x.toString()).replace(/###MAPY###/g, y.toString());
      } else {
        link.content = null;
      }
    }
  }

  public resetRasters(): void {
    this.rasters.forEach((el) => {
      el.pixelvalue = null;
      el.pixelstring = null;
    });

    this.MapContextMenuState.sources.forEach((src) => {
      src.content = this.i18nManager.getTranslation('Loading');
      src.loading = true;
    });
  }

  public updateRasterSamples(): void {
    this.resetRasters();
    this.rasters.forEach(async (raster) => {
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

        const entry = this.MapContextMenuState.sources.find((s) => s.id === raster.id);
        if (entry) {
          entry.content = raster.pixelstring;
          entry.loading = false;
        }
      } catch (err) {
        console.warn(`Failed to query raster source: ${raster.url}:`, err);
      }
    });
  }
}
