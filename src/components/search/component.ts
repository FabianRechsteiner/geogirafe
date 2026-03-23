// SPDX-License-Identifier: Apache-2.0
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import tippy from 'tippy.js';

import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { type Geometry, Point } from 'ol/geom';
import { Fill, Icon, Stroke, Style } from 'ol/style';
import { buffer, containsExtent, type Extent, getCenter, getHeight, getWidth } from 'ol/extent';
import type { Color } from 'vanilla-picker';
import GirafeColorPicker from '../../tools/utils/girafecolorpicker';

import PinIcon from './images/pin.svg';
import LayerIcon from './images/layer.svg';
import LayerGroupIcon from './images/layergroup.svg';
import SearchIcon from './images/search.svg';
import PaintbrushIcon from './images/paintbrush.svg';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import type { SearchResultsActions } from '../../models/searchresult';
import { parseCoordinates } from '../../tools/geometrytools';
import ThemeLayer from '../../models/layers/themelayer';
import { LayerTreeChanges } from '../../tools/themes/themeshelper';

class SearchComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  public searchIcon: string = SearchIcon;
  public paintbrushIcon: string = PaintbrushIcon;

  private get map() {
    return this.context.mapManager.getMap();
  }

  private readonly previewFeaturesCollection: Collection<Feature<Geometry>> = new Collection();
  private previewLayers?: LayerTreeChanges;
  private previewGeoLayer: VectorLayer<VectorSource> | null = null;
  private maxExtent?: number[];
  private readonly geoJsonFormatter = new GeoJSON();

  private ignoreBlur = false;
  public groupedResults: Record<string, Feature[]> = {};
  protected allResults: Feature[] = [];
  protected forceHide = true;

  private readonly searchTermPlaceholder = '###SEARCHTERM###';
  private readonly searchLangPlaceholder = '###SEARCHLANG###';
  private readonly COORD_REGEX = /^(\d+[.,]?\d*)\s*[,;/\s]\s*(\d+[.,]?\d*)$/;

  private focusedResultIndex = -1;
  private focusedResult: Feature | null = null;
  private selectedResult: Feature | null = null;

  private searchInput?: HTMLInputElement;
  private girafeColorPicker?: GirafeColorPicker;

  public paintSearchResults?: boolean;
  public defaultSearchStrokeColor!: string;
  public defaultSearchFillColor!: string;
  public searchStrokeColor!: string;
  public searchFillColor!: string | number[];

  private abortController = new AbortController();
  public showNoResultWarning = false;

  // Keeping track of the last input timeout
  private ongoingSearchTimeoutId = 0;

  public constructor() {
    super('search');
  }

  private async initialSearch() {
    const searchTerm = this.context.permalinkManager.getSearchTerm();
    const results = await this.fetchSearch(searchTerm);
    if (results.length > 0) {
      // Apply the first search result in the list
      const firstResult = results[0];
      this.preview(firstResult);
      this.onSelect(firstResult);
    }
  }

  private createPreviewLayer() {
    this.paintSearchResults = this.context.configManager.Config.search.paintSearchResults;
    this.maxExtent = this.context.configManager.Config.map.maxExtent?.split(',').map(Number);

    this.previewGeoLayer = new VectorLayer({
      properties: {
        addToPrintedLayers: true
      },
      source: new VectorSource({
        features: this.previewFeaturesCollection
      })
    });
    this.updatePreviewLayerStyle(this.defaultSearchFillColor, this.defaultSearchStrokeColor);
    this.map.addLayer(this.previewGeoLayer);
    this.previewGeoLayer.setZIndex(1010);

    this.initColorPicker();
  }

  toggleVisibility(visible: boolean) {
    (this.shadowRoot?.host as HTMLElement).style.display = visible ? 'flex' : 'none';
  }

  public onMouseDown() {
    this.ignoreBlur = true;
  }

  public onFocusIn() {
    this.forceHide = false;
    super.render();
  }

  public onFocusOut() {
    if (!this.ignoreBlur) {
      this.forceHide = true;
      super.render();
    }
    this.ignoreBlur = false;
  }

  public render() {
    super.render();
    this.searchInput = this.shadowRoot?.getElementById('search') as HTMLInputElement;
  }

  registerEvents(): void {
    this.subscribe('interface.searchComponentVisible', (_oldValue: boolean, newValue: boolean) =>
      this.toggleVisibility(newValue)
    );
  }

  protected override connectedCallback() {
    super.connectedCallback();

    this.defaultSearchStrokeColor = this.context.configManager.Config.search.defaultStrokeColor as string;
    this.defaultSearchFillColor = this.context.configManager.Config.search.defaultFillColor as string;
    this.createPreviewLayer();

    this.render();
    super.girafeTranslate();
    this.registerEvents();
    this.createTooltip();
    if (this.context.permalinkManager.hasSearch()) {
      this.subscribe('application.isReady', () => {
        if (this.state.application.isReady) {
          this.initialSearch();
        }
      });
    }
  }

  protected clearSearch(purge = false) {
    if (purge) {
      if (this.searchInput) {
        this.searchInput.value = '';
      }
    }
    this.forceHide = false;
    this.groupedResults = {};
    this.allResults = [];
    this.clearPreview();
    this.focusedResultIndex = -1;
    this.focusedResult = null;
    super.render();
  }

  public async doSearch(e: Event) {
    this.showNoResultWarning = false;

    // Cancel any previous search
    this.abortController.abort();
    // Create a new controller for the new request
    this.abortController = new AbortController();

    const target = e.target as HTMLInputElement;
    const term = target.value.trim();
    this.clearSearch();

    if (this.COORD_REGEX.test(term)) {
      this.displayCoordinates(term);
      return;
    }
    if (term.length > 0) {
      try {
        const features = await this.fetchSearch(term);
        // If the search term is at least two charecter but yieds no result, a warning
        // box is displayed for 2 seconds and then fades out (CSS)
        if (features.length === 0 && term.length >= 2) {
          this.showNoResultWarning = true;
        }
        this.displayResults(features);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Request was aborted, ignore the error
          console.debug('Multiple parallel search: previous request was aborted.');
          return;
        }
      }
    }
  }

  protected async fetchSearch(term: string): Promise<Feature[]> {
    const url = this.context.configManager.Config.search.url
      .replace(this.searchTermPlaceholder, term)
      .replace(this.searchLangPlaceholder, this.state.language as string);
    const response = await fetch(url, { signal: this.abortController.signal });
    const data = await response.json();

    return this.geoJsonFormatter.readFeatures(data, {
      dataProjection: this.context.configManager.getDefaultConfigValue('search.resultsSrid') as string,
      featureProjection: this.map.getView().getProjection()
    });
  }

  /**
   * Debounce the fetch call to API to prevent sending request at every stroke.
   * @param e
   */
  public async doSearchDebounced(e: Event) {
    if (this.ongoingSearchTimeoutId !== 0) {
      clearTimeout(this.ongoingSearchTimeoutId);
    }

    // The original even cannot be passed because event objects are ephemeral and
    // not designed to be used asynchronously (the target property would be undefined)
    const syntheticEvent = {
      target: { value: e.target && 'value' in e.target ? e.target.value : undefined }
    } as unknown as Event;

    this.ongoingSearchTimeoutId = window.setTimeout(() => {
      this.ongoingSearchTimeoutId = 0;
      this.doSearch(syntheticEvent);
    }, 300);
  }

  /**
   * Will render the result of the search with coordinates
   * @param term typed string
   */
  private displayCoordinates(term: string) {
    const matches = this.COORD_REGEX.exec(term) as RegExpExecArray;
    const coord1 = Number.parseFloat(matches[1].replace(',', '.'));
    const coord2 = Number.parseFloat(matches[2].replace(',', '.'));

    const current_srid = this.map.getView().getProjection().getCode();
    const [east_coord, north_coord] = parseCoordinates([coord1, coord2], this.maxExtent, current_srid);
    // Don't show result if no corresponding coordinates were parsed
    if (!east_coord || !north_coord) {
      return;
    }

    const feature = new Feature({
      geometry: new Point([east_coord, north_coord]),
      label: `${coord1} ${coord2}`,
      layer_name: 'recenter_map'
    });

    this.allResults = [feature];
    this.groupedResults.recenter_map = [feature];
    super.render();
    super.girafeTranslate();
  }

  private displayResults(features: Feature[]) {
    // First, group the results
    for (const result of features) {
      // results.features.forEach((result) => {
      let type = 'Unknown layer type';
      if (result.get('layer_name')) {
        type = result.get('layer_name');
      } else if (result.get('actions')[0].action.startsWith('add_theme')) {
        type = 'add_theme';
      } else if (result.get('actions')[0].action.startsWith('add_group')) {
        type = 'add_group';
      } else if (result.get('actions')[0].action.startsWith('add_layer')) {
        type = 'add_layer';
      }

      let resultList: Feature[];
      if (type in this.groupedResults) {
        resultList = this.groupedResults[type];
      } else {
        resultList = [];
        this.groupedResults[type] = resultList;
      }

      resultList.push(result);
    }

    // Manage a flat list with all results
    this.allResults = Object.values(this.groupedResults).flat();

    // And then rerender the results
    super.render();
    super.girafeTranslate();
  }

  public getIcon(searchGroup: string) {
    switch (searchGroup) {
      case 'Group':
        return LayerGroupIcon;
      case 'Layer':
        return LayerIcon;
      default:
        return PinIcon;
    }
  }

  public onMouseOver(result: Feature) {
    this.focusResult(result);
  }

  public onMouseLeave() {
    // Clear preview search result, only if the result was not selected
    if (this.selectedResult === null) {
      this.clearPreview();
    }
  }

  private focusResultFromIndex() {
    const result = this.allResults[this.focusedResultIndex];
    this.focusResult(result);
  }

  private focusResult(result: Feature) {
    // Clear old selection and preview
    this.clearPreview();
    if (this.focusedResult) {
      this.focusedResult.set('selected', false);
    }

    // Set new selected object, and activate preview
    this.focusedResultIndex = this.allResults.indexOf(result);
    this.focusedResult = this.allResults[this.focusedResultIndex];
    this.focusedResult.set('selected', true);
    this.render();
    this.preview(result);

    // Scroll to selected div
    const resultHtmlElement = this.shadow.querySelectorAll('.result')[this.focusedResultIndex];
    resultHtmlElement.scrollIntoView({ block: 'nearest' });
  }

  private preview(result: Feature) {
    if (result.getGeometry() && this.context.configManager.Config.search.objectPreview) {
      // Result with geometry
      this.addFeatureToPreview(result);
      this.updatePreviewLayerStyle();
    }
    const firstAction = result.get('actions')?.[0];
    if (firstAction?.action.startsWith('add_layer') && this.context.configManager.Config.search.layerPreview) {
      const layer = this.context.themesHelper.findLayerByName(firstAction.data);
      if (layer) {
        const clonedTheme = this.context.themesHelper.getMinimalClonedThemeForLayer(layer);
        clonedTheme.isExpanded = true;
        this.previewLayers = this.context.themesHelper.mergeThemeInLayerTree(clonedTheme, true);
      } else {
        console.error(`Layer ${firstAction.data} cannot be found`);
      }
    }
  }

  private addFeatureToPreview(feature: Feature) {
    this.previewFeaturesCollection.push(feature);
  }

  public clearPreview() {
    // Clear preview search result
    this.previewFeaturesCollection.clear();

    // Clear preview layer
    if (this.previewLayers) {
      this.context.themesHelper.removeLayersFromLayerTree(this.previewLayers.insertedLayers);
      for (const layer of this.previewLayers.activatedLayers) {
        this.context.layerManager.toggle(layer, 'off');
      }
      this.previewLayers = undefined;
    }
  }

  public onSelect(feature: Feature) {
    this.selectedResult = feature;
    this.ignoreBlur = false;
    this.forceHide = true;
    this.previewLayers = undefined;
    super.render();

    const geom = feature.getGeometry();
    if (geom) {
      // Result with geometry
      this.zoomTo(geom.getExtent());
    } else {
      this.addResultToTreeView(feature);
    }

    this.onFocusOut();

    // Update searchbox with result
    if (this.searchInput && feature.get('label')) {
      this.searchInput.value = feature.get('label');
    }
  }

  private addResultToTreeView(feature: Feature) {
    let clonedTheme: ThemeLayer | undefined;
    const actions = feature.get('actions') as SearchResultsActions[] | undefined;
    if (!actions || actions.length === 0) {
      // Nothing to add
      return;
    }

    let activate = false;
    if (actions[0].action.startsWith('add_theme')) {
      const theme = this.context.themesHelper.findThemeByName(actions[0].data);
      if (theme) {
        clonedTheme = theme.clone();
      }
    } else if (actions[0].action.startsWith('add_group')) {
      const group = this.context.themesHelper.findGroupByName(actions[0].data);
      if (group) {
        clonedTheme = this.context.themesHelper.getMinimalClonedThemeForLayer(group);
      }
    } else if (actions[0].action.startsWith('add_layer')) {
      const layer = this.context.themesHelper.findLayerByName(actions[0].data);
      if (layer) {
        clonedTheme = this.context.themesHelper.getMinimalClonedThemeForLayer(layer);
        activate = true;
      }
    } else {
      console.warn('Unsupported result type');
    }

    if (clonedTheme) {
      this.context.themesHelper.mergeThemeInLayerTree(clonedTheme, activate);
    }
  }

  private zoomTo(extent: Extent) {
    // We create a buffer around the extent from 50% of the width/height
    const bufferValue = Math.max((getWidth(extent) * 50) / 100, (getHeight(extent) * 50) / 100);
    const bufferedExtent = buffer(extent, bufferValue);

    const minResolution = this.context.configManager.Config.search.minResolution;
    const currentResolution = this.map.getView().getResolution() as number;
    const currentExtent = this.map.getView().calculateExtent();

    if (minResolution) {
      if (currentResolution > minResolution) {
        // If we are in a bigger resolution as the minimal one,
        // Zoom to object with minResolution
        this.context.mapManager.zoomToExtent(bufferedExtent, minResolution);
      } else if (!containsExtent(currentExtent, extent)) {
        // Else, if the extent is NOT already within the current extent of the map
        // We keep the current resolution, and just pan to object
        this.state.position.center = getCenter(extent);
      }
    }
    // Otherwise, if the searched object is already in the current map extent
    // We do nothing
  }

  public onMouseMove() {
    // if the mouse moves, we activate the hover effect
    const results = this.shadowRoot?.querySelectorAll('.result');

    if (!results) {
      return;
    }

    for (const result of results) {
      result.classList.remove('active');
      const htmlResult = result as HTMLElement;
      htmlResult.style.removeProperty('background-color');
    }
  }

  public onKeyDown(e: KeyboardEvent) {
    // clear search on escape
    if (e.key === 'Escape') {
      this.clearSearch(true);
    }

    // automatic re-open search results on enter
    else if (this.forceHide) {
      if (e.key === 'Enter') {
        this.onFocusIn();
      }
    }

    // navigate through search results
    else if (!this.forceHide) {
      this.navigateToResult(e);
    }
  }

  private navigateToResult(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        if (this.focusedResultIndex < this.allResults.length - 1) {
          this.focusedResultIndex += 1;
          this.focusResultFromIndex();
        }
        break;

      case 'ArrowUp':
        if (this.focusedResultIndex > 0) {
          this.focusedResultIndex -= 1;
          this.focusResultFromIndex();
        }
        break;

      case 'Enter':
        if (this.focusedResultIndex >= 0) {
          this.onSelect(this.allResults[this.focusedResultIndex]);
        }
        break;
    }
  }

  private createTooltip() {
    const searchInput = this.shadowRoot?.getElementById('search');
    if (searchInput) {
      // Create a tooltip using tippy.js
      tippy(searchInput, {
        content: () => {
          // Check if there's a slot named "search-tooltip"
          const slot = this.shadow.querySelector('slot[name="search-tooltip"]') as HTMLSlotElement;
          if (slot) {
            const assignedNodes = slot.assignedNodes({ flatten: true });
            if (assignedNodes.length > 0) {
              // Create a temporary div to hold the content
              const tooltipContent = document.createElement('div');
              assignedNodes.forEach((node) => {
                tooltipContent.appendChild(node.cloneNode(true));
              });
              return tooltipContent;
            }
          }
          // Fallback to the default tooltip text if no slot content is found
          return this.context.i18nManager.getTranslation('search_tooltip') || 'Search...';
        },
        trigger: 'mouseenter',
        hideOnClick: false,
        interactive: true,
        theme: 'light',
        placement: 'bottom',
        arrow: true,
        appendTo: document.body,
        maxWidth: '300px'
      });
    }
  }

  private initColorPicker() {
    super.render();
    const colorPicker = this.shadowRoot?.getElementById('colorPickerBtn');
    if (colorPicker) {
      this.girafeColorPicker = new GirafeColorPicker({
        parent: colorPicker,
        color: this.context.configManager.Config.search.defaultStrokeColor,
        popup: 'right'
      });
      this.girafeColorPicker.onChange = (color: Color) => {
        // The fill color should be the selected color with a bit more transparency
        const fillColor = [color.rgba[0], color.rgba[1], color.rgba[2], color.rgba[3] / 2];
        this.searchFillColor = fillColor;
        this.searchStrokeColor = color.hex;
        this.updatePreviewLayerStyle(fillColor, color.hex);
      };
      this.girafeColorPicker.onOpen = (_) => {
        if (this.defaultColorHasChanged()) {
          this.girafeColorPicker?.setColor(this.context.configManager.Config.search.defaultStrokeColor as string, true);
        }
      };
    }
  }

  private updatePreviewLayerStyle(fillColor?: string | number[], strokeColor?: string) {
    if (!this.previewGeoLayer) {
      return;
    }

    // Only update style if new colors were provided via color picker or default colors have changed
    if (this.defaultColorHasChanged()) {
      const defaultFillColor = this.context.configManager.Config.search.defaultFillColor as string;
      this.defaultSearchFillColor = defaultFillColor;
      this.searchFillColor = defaultFillColor;
      const defaultStrokeColor = this.context.configManager.Config.search.defaultStrokeColor as string;
      this.defaultSearchStrokeColor = defaultStrokeColor;
      this.searchStrokeColor = defaultStrokeColor;
    }
    const strokeColorWithFallback = strokeColor ?? this.searchStrokeColor ?? this.defaultSearchStrokeColor;
    const fillColorWithFallback = fillColor ?? this.searchFillColor ?? this.defaultSearchFillColor;

    this.previewGeoLayer.setStyle(
      new Style({
        stroke: new Stroke({
          color: strokeColorWithFallback,
          width: this.context.configManager.Config.search.defaultStrokeWidth
        }),
        fill: new Fill({ color: fillColorWithFallback }),
        image: new Icon({
          anchor: [0.5, 1],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: this.getColoredPinIcon(strokeColorWithFallback),
          scale: 0.3
        })
      })
    );
  }

  private defaultColorHasChanged(): boolean {
    return (
      this.defaultSearchFillColor !== this.context.configManager.Config.search.defaultFillColor ||
      this.defaultSearchStrokeColor !== this.context.configManager.Config.search.defaultStrokeColor
    );
  }

  private getColoredPinIcon(hexColor: string) {
    const pin = `<svg xmlns="http://www.w3.org/2000/svg" 
                      width="120" 
                      height="120" 
                      style="fill: ${hexColor};" 
                      viewBox="0 0 384 512">
                    <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 
                             307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
                 </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(pin)}`;
  }
}

export default SearchComponent;
