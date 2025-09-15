import GirafeSingleton from '../../base/GirafeSingleton';
import DOMPurify from 'dompurify';
import StateManager from '../state/statemanager';
import UrlManager from './urlmanager';
import MapPosition from '../state/mapposition';
import { get as getProjection, Projection, transform } from 'ol/proj';
import { isCoordinateInDegrees } from '../utils/olutils';
import ConfigManager from '../configuration/configmanager';

export default class PermalinkManager extends GirafeSingleton {
  stateManager: StateManager;
  urlManager: UrlManager;
  urlParamKeys: string[] = [
    'map_x',
    'map_y',
    'map_zoom',
    'map_crosshair',
    'map_tooltip',
    'search',
    'basemap',
    'themes',
    'groups',
    'layers'
  ];
  urlParamKeysWithPrefix: string[] = ['wfs_'];
  params: Record<string, string | null> = {};

  constructor(type: string) {
    super(type);
    this.stateManager = StateManager.getInstance();
    this.urlManager = UrlManager.getInstance();
    this.getPermalinkParamsFromUrl();
    this.removePermalinkParamsFromUrl();
  }

  private get state() {
    return this.stateManager.state;
  }

  private getPermalinkParamsFromUrl() {
    this.params = {
      ...this.urlManager.getParams(...this.urlParamKeys),
      ...this.urlManager.getParamsWithPrefix(...this.urlParamKeysWithPrefix)
    };
  }

  private removePermalinkParamsFromUrl() {
    for (const key in this.params) {
      this.urlManager.removeParams(key);
    }
  }

  public hasFeatureSelectionQuery() {
    return this.params['wfs_layer'] !== undefined;
  }

  public getFeatureSelectionQuery() {
    if (!this.hasFeatureSelectionQuery()) {
      return null;
    }
    const param_prefix = 'wfs_';
    const queryLayer = this.params['wfs_layer'];
    const queryAttributes = [];
    for (const key in this.params) {
      if (key.startsWith(param_prefix) && key !== 'wfs_layer') {
        queryAttributes.push({
          name: key.substring(param_prefix.length),
          value: DOMPurify.sanitize(this.params[key] ?? '')
        });
      }
    }
    if (queryLayer && queryAttributes.length > 0) {
      return {
        layer: queryLayer,
        properties: queryAttributes
      };
    }
    return null;
  }

  public hasMapPosition() {
    // When map position and feature query are present, the feature selection query has priority.
    // It will move the map to display all selected features, making an additional map position unnecessary.
    return this.params['map_x'] && this.params['map_y'] && this.params['map_zoom'] && !this.hasFeatureSelectionQuery();
  }

  public hasToolTip() {
    return this.params['map_tooltip'] !== null;
  }

  public getMapPosition(targetProjection: Projection) {
    if (this.hasMapPosition()) {
      const position = new MapPosition();

      let center = [parseFloat(this.params['map_x']!), parseFloat(this.params['map_y']!)];
      // Transform position to the target projection by making an educated guess about the current CRS
      // of the permalink map position
      const defaultProjection = ConfigManager.getInstance().getDefaultConfigValue('map.srid') as string;
      const projectionInUrl = getProjection(isCoordinateInDegrees(position.center) ? 'EPSG:4326' : defaultProjection)!;
      if (projectionInUrl.getCode() !== this.state.projection) {
        center = transform(center, projectionInUrl, targetProjection);
      }

      position.center = center;
      position.zoom = parseFloat(this.params['map_zoom']!);

      if (this.params['map_crosshair'] === 'true') {
        position.crosshair = center;
      }

      if (this.hasToolTip()) {
        const content = DOMPurify.sanitize(this.params['map_tooltip']!, {
          ALLOWED_TAGS: ['br', 'b', 'div', 'em', 'i', 'p', 'strong'],
          ALLOWED_ATTR: []
        });
        position.tooltip = {
          content: content,
          position: center
        };
      }

      if (position.isValid) {
        return position;
      }
    }
    return undefined;
  }

  public hasSearch() {
    return this.params['search'] !== null;
  }

  public getSearchTerm(): string {
    if (this.hasSearch()) {
      return this.params['search']!;
    }
    throw new Error('No search param in the Permalink!');
  }

  public hasThemes() {
    return this.params['themes'] !== null;
  }

  public getThemes(): string[] {
    if (this.hasThemes()) {
      return this.params['themes']!.split(',');
    }
    throw new Error('No themes param in the Permalink!');
  }

  public hasBasemap() {
    return this.params['basemap'] !== null;
  }

  public getBasemap(): string {
    if (this.hasBasemap()) {
      return this.params['basemap']!;
    }
    throw new Error('No basemap param in the Permalink!');
  }

  public hasGroups() {
    return this.params['groups'] !== null;
  }

  public getGroups(): string[] {
    if (this.hasGroups()) {
      return this.params['groups']!.split(',');
    }
    throw new Error('No groups param in the Permalink!');
  }

  public hasLayers() {
    return this.params['layers'] !== null;
  }

  public getLayers(): string[] {
    if (this.hasLayers()) {
      return this.params['layers']!.split(',');
    }
    throw new Error('No layers param in the Permalink!');
  }
}
