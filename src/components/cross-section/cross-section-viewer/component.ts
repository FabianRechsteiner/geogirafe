import type { Callback } from '../../../tools/state/statemanager';
import type { ColorVariable, ColorPalette, PytreeResponseData, Dataset } from './../crosssectiontypes';
import type { Marker } from './../scatterplot';
import { CursorMoveEvent, ChangeDomainEvent, ChangeMarkersEvent, ChangeMeasurementsEvent } from './../scatterplot';

import GirafeResizableElement from '../../../base/GirafeResizableElement';
import { CrossSectionState } from './../crosssectionstate';
import ConfigManager from '../../../tools/configuration/configmanager';
import { Scatterplot } from '../scatterplot';
import { PytreeManager } from '../pytreemanager';
import { computeColors } from '../utils';
import { download } from '../../../tools/export/download';

class CrossSectionViewComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../../styles/common.css'];

  crossSectionState: CrossSectionState;
  private readonly eventsCallbacks: Callback[] = [];
  darkFrontendMode: boolean = false;
  private visible: boolean = false;
  scatterplot: Scatterplot | undefined;
  abortController: AbortController;
  uv: Float32Array;
  rgb: Uint8Array; // 1 byte * 3 values
  intensity: Uint16Array;
  classification: Uint8Array;
  group: Uint8Array;
  currentRefreshId: symbol | undefined;
  panel: HTMLDivElement | null = null;
  pytreeManager: PytreeManager | null = null;
  private scatterplotInitialized = false;

  constructor() {
    super('cross-section-view');

    this.crossSectionState = this.state.extendedState.crossSection as CrossSectionState;
    this.abortController = new AbortController();

    // Initialize point data attributes
    this.uv = new Float32Array(this.crossSectionState.maxNumberOfPoints * 2); // 4 bytes * 2 values
    this.rgb = new Uint8Array(this.crossSectionState.maxNumberOfPoints * 3); // 1 byte * 3 values
    this.intensity = new Uint16Array(this.crossSectionState.maxNumberOfPoints); // 2 bytes * 1 value
    this.classification = new Uint8Array(this.crossSectionState.maxNumberOfPoints); // 1 bytes * 1 value
    this.group = new Uint8Array(this.crossSectionState.maxNumberOfPoints); // 1 bytes * 1 value
  }

  async initPytreeManager() {
    const baseURL = ConfigManager.getInstance().Config.lidar?.url.replace(/\/?$/, '/') ?? '';
    this.pytreeManager = new PytreeManager(baseURL);

    await this.pytreeManager.getConfig();

    const ds = [];
    for (const [k, id] of this.pytreeManager.config!.pointclouds.entries()) {
      ds.push({
        id: id,
        group: k,
        color: this.crossSectionState.qualitativeColors[k % this.crossSectionState.qualitativeColors.length],
        active: id === this.pytreeManager.config?.default_point_cloud,
        isloaded: false,
        loading: false,
        levelOfDetail: 0,
        colorby: 'uniform' as ColorVariable,
        numberOfLoadedPoints: 0,
        subsets: []
      });
    }
    this.crossSectionState.datasets = ds;
  }

  async refreshData(lineWidth: number, lineCoordinates: [number, number][], incremental = false): Promise<void> {
    // Only abort if we were actually loading
    if (this.crossSectionState.loading && this.abortController) {
      this.abortOngoingRequest();
    }

    // Reset if not incremental
    if (!incremental) {
      this.scatterplot!.clearGLPoints();
      this.crossSectionState.numberOfPoints = 0;

      this.uv = new Float32Array(this.crossSectionState.maxNumberOfPoints * 2);
      this.rgb = new Uint8Array(this.crossSectionState.maxNumberOfPoints * 3);
      this.intensity = new Uint16Array(this.crossSectionState.maxNumberOfPoints);
      this.classification = new Uint8Array(this.crossSectionState.maxNumberOfPoints);
      this.group = new Uint8Array(this.crossSectionState.maxNumberOfPoints);

      for (const ds of this.crossSectionState.datasets) {
        ds.numberOfLoadedPoints = 0;
        ds.isloaded = false;
        ds.loading = true;
        ds.levelOfDetail = 0;
        ds.subsets = [];
      }
    }

    if (!this.pytreeManager) {
      await this.initPytreeManager();
    }

    // Check argument validity
    if (!this.validateRequestArgs(lineWidth, lineCoordinates)) {
      return;
    }

    // Abort any previous fetch
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const coordinateString = lineCoordinates.map((c) => `{${c}}`).join();
    const refreshId = Symbol('refreshId');
    this.currentRefreshId = refreshId;

    for (let LOD = this.crossSectionState.minLOD; LOD <= this.crossSectionState.maxLOD; LOD++) {
      const keepGoing = await this.fetchOneLOD(LOD, lineWidth, coordinateString, signal, refreshId);
      if (!keepGoing) {
        break;
      }

      // If final LOD reached and not aborted, disable loading
      if (LOD === this.crossSectionState.maxLOD) {
        this.crossSectionState.loading = false;
      }
    }
  }

  // Fetch data for a single LOD across all datasets.
  private async fetchOneLOD(
    LOD: number,
    lineWidth: number,
    coordinateString: string,
    signal: AbortSignal,
    refreshId: symbol
  ): Promise<boolean> {
    this.crossSectionState.loading = true;

    for (const ds of this.crossSectionState.datasets) {
      if (!ds.active || ds.isloaded) {
        continue;
      }

      const response = await this.pytreeManager!.getData(ds.id, LOD, LOD, lineWidth, coordinateString, signal);

      // Abort if no response, cancelled, or a new refresh started
      if (!response || signal.aborted || this.currentRefreshId !== refreshId) {
        console.warn('Data fetch aborted');
        return false;
      }

      const ptsRemaining = this.crossSectionState.maxNumberOfPoints - this.crossSectionState.numberOfPoints;
      const ptsReturned = response.metadata.points;

      // if no points returned, mark ds as loaded at max LOD and skip
      if (ptsReturned === 0) {
        if (LOD === this.crossSectionState.maxLOD) {
          ds.isloaded = true;
          ds.loading = false;
        }
        continue;
      }

      if (ptsReturned > 0 && ptsRemaining > 0) {
        new Uint8Array(ptsReturned).fill(ds.group).forEach((g, i) => {
          this.group[this.crossSectionState.numberOfPoints + i] = g;
        });

        const data = response.data as PytreeResponseData;

        if (data.POSITION_PROJECTED_PROFILE) {
          this.uv.set(
            data.POSITION_PROJECTED_PROFILE.slice(0, ptsRemaining * 2),
            this.crossSectionState.numberOfPoints * 2
          );
        }
        if (data.RGB) {
          this.rgb.set(data.RGB.slice(0, ptsRemaining * 3), this.crossSectionState.numberOfPoints * 3);
        }
        if (data.INTENSITY) {
          this.intensity.set(data.INTENSITY.slice(0, ptsRemaining), this.crossSectionState.numberOfPoints);
        }
        if (data.CLASSIFICATION) {
          this.classification.set(data.CLASSIFICATION.slice(0, ptsRemaining), this.crossSectionState.numberOfPoints);
        }

        ds.subsets.push({
          lod: LOD,
          offset: this.crossSectionState.numberOfPoints,
          count: ptsReturned
        });

        this.crossSectionState.numberOfPoints = Math.min(
          this.crossSectionState.maxNumberOfPoints,
          this.crossSectionState.numberOfPoints + ptsReturned
        );
        ds.numberOfLoadedPoints += ptsReturned;

        // Push partial update to GL
        this.updateScatterplot(refreshId);
      }

      ds.levelOfDetail = LOD;

      // If maximum number of points to display is reached, stop loading
      if (this.crossSectionState.numberOfPoints >= this.crossSectionState.maxNumberOfPoints) {
        for (const other of this.crossSectionState.datasets) {
          if (other.active) {
            other.isloaded = true;
            other.loading = false;
          }
        }
        this.crossSectionState.loading = false;
        return false;
      }
    }

    return true;
  }

  // Rebuild the element‑index buffer and patch‑uploads any changed colour slices, then issues one GL draw call
  private redrawChangedDatasets(): void {
    if (!this.scatterplot) {
      return;
    }

    // Rebuild index buffer (to draw only selected datasets)
    const idx = this.buildIndexList(this.crossSectionState.datasets);
    this.scatterplot.updateIndex(idx);

    // Recompute & patch‑upload colours for every active dataset
    for (const ds of this.crossSectionState.datasets) {
      if (!ds.active) {
        continue;
      }

      for (const subset of ds.subsets) {
        const slice = this.changeColormap(
          ds.colorby,
          ds.color,
          subset.offset,
          subset.count,
          this.crossSectionState.colorPalette
        );
        this.scatterplot.updateColorsSlice(slice, subset.offset);
      }
    }

    this.scatterplot.updateTransform();
  }

  private validateRequestArgs(lineWidth: number, lineCoordinates: [number, number][]): boolean {
    if (lineWidth <= 0.0) {
      console.warn('lineWidth must be larger than 0');
      return false;
    }
    if (lineCoordinates.length < 2) {
      console.warn('At least two line coordinates are required');
      return false;
    }
    return true;
  }

  private abortOngoingRequest(): void {
    if (this.crossSectionState.loading) {
      this.abortController.abort('New linestring requested before previous data finished loading');
      this.scatterplot!.clearGLPoints();
      this.crossSectionState.loading = false;
    }
    this.abortController = new AbortController();
  }

  private buildIndexList(datasets: Dataset[]): Uint32Array {
    const indices = [];

    for (const dataset of datasets) {
      if (!dataset.active) {
        continue;
      }

      for (const subset of dataset.subsets) {
        const start = subset.offset;
        const end = start + subset.count;
        for (let i = start; i < end; i++) {
          indices.push(i);
        }
      }
    }
    return new Uint32Array(indices);
  }

  private updateScatterplot(refreshId: symbol): void {
    if (!this.scatterplot || this.currentRefreshId !== refreshId) {
      return;
    }

    const idx = this.buildIndexList(this.crossSectionState.datasets);
    const points = this.uv.subarray(0, this.crossSectionState.numberOfPoints * 2);
    const colors = new Uint8Array(this.crossSectionState.numberOfPoints * 3);

    for (const ds of this.crossSectionState.datasets) {
      if (!ds.active) continue;
      for (const s of ds.subsets) {
        const slice = this.changeColormap(ds.colorby, ds.color, s.offset, s.count, this.crossSectionState.colorPalette);
        colors.set(slice, s.offset * 3);
      }
    }

    this.scatterplot.updatePoints(points);
    this.scatterplot.updateColors(colors);

    // Initial GL set‑up happens only once
    if (!this.scatterplotInitialized) {
      this.scatterplot.initializeGL();
      this.scatterplotInitialized = true;
    }

    this.scatterplot.updateIndex(idx);
    this.scatterplot.updateTransform();

    // Draw the SVG overlays
    this.scatterplot.updatePlot();
  }

  changeColormap(
    variable: ColorVariable,
    color: string,
    offset: number,
    numberOfPoints: number,
    colormap: ColorPalette = 'spectral'
  ) {
    let colors;
    const offsetStart = offset;
    const offsetEnd = offset + numberOfPoints;

    switch (variable) {
      case 'intensity':
        colors = computeColors(this.intensity.slice(offsetStart, offsetEnd), colormap, [15000, 65000]);
        break;
      case 'natural':
        colors = this.rgb.slice(offsetStart * 3, (offsetStart + numberOfPoints) * 3);
        break;
      case 'classification':
        colors = this.pytreeManager!.getClassificationColor(
          this.classification.slice(offsetStart, offsetEnd),
          this.pytreeManager!.config!.classification_colors
        );
        break;
      case 'uniform':
        colors = computeColors(this.classification.slice(offsetStart, offsetEnd), color, []);
        break;
    }

    return colors;
  }

  printCanvas() {
    this.scatterplot?.updateTransform();
    const canvas = this.scatterplot?.canvas.node() as HTMLCanvasElement;

    if (canvas) {
      const scaleFactor = 1.0;
      const printWidth = scaleFactor * canvas.width;
      const printHeight = scaleFactor * canvas.height;

      // Get SVG elements
      const svg = this.scatterplot?.containerSVG.node()!.cloneNode(true) as SVGElement;

      // Adjust SVG dimensions for print
      svg.setAttribute('width', printWidth.toString());
      svg.setAttribute('height', printHeight.toString());

      // Serialise SVG
      const svgString = new XMLSerializer().serializeToString(svg);
      const printString = `<svg width="${printWidth}" height="${printHeight}" xmlns="http://www.w3.org/2000/svg"><image href="${canvas.toDataURL('image/png')}" x="0" y="0" width="${printWidth}" height="${printHeight}" />${svgString}</svg>`;
      download(printString, 'profile.svg', 'image/svg+xml;charset=utf-8');
    }
  }

  render() {
    if (this.visible) {
      this.renderComponent();
    } else {
      this.abortOngoingRequest();
      this.unregisterEvents();
      this.renderEmpty();
    }
  }

  private renderComponent() {
    super.render();
    super.girafeTranslate();

    this.panel = this.shadowRoot!.getElementById('profile-panel') as HTMLDivElement;

    this.scatterplot = new Scatterplot(
      this.panel,
      this.crossSectionState.margins,
      new Float32Array(0),
      new Uint8Array(0)
    );

    this.scatterplot.setZoom(this.crossSectionState.zoom);
    this.registerEvents();
  }

  registerEvents(): void {
    this.eventsCallbacks.push(
      this.subscribe('interface.darkFrontendMode', (_oldValue: boolean, _newValue: boolean) => {
        this.darkFrontendMode = _newValue;
      }),
      this.subscribe(
        'extendedState.crossSection.verticalExaggerationSettings.value',
        (_oldVal: number, _newVal: number) => {
          this.scatterplot?.updateVerticalExaggeration(_newVal);
        }
      ),
      this.subscribe(
        'extendedState.crossSection.pointSizeSettings.value',
        (_oldVal: number, _newVal: number, _parent: CrossSectionState) => {
          this.scatterplot?.updatePointSize(_newVal);
        }
      ),
      this.subscribe(
        'extendedState.crossSection.backgroundColor',
        (_oldVal: string, _newVal: string, _parent: CrossSectionState) => {
          this.scatterplot?.setBackgroundColor(_newVal);
        }
      ),
      this.subscribe(
        'extendedState.crossSection.gridVisible',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          this.scatterplot?.setGridVisibility(_newVal);
        }
      ),
      this.subscribe(
        'extendedState.crossSection.colorPalette',
        (_oldVal: string, _newVal: string, _parent: CrossSectionState) => {
          // Recolor data slices in‑place
          if (this.crossSectionState.numberOfPoints > 0) {
            this.redrawChangedDatasets();
          }
        }
      ),

      this.subscribe(
        'extendedState.crossSection.zoom',
        (
          _oldVal: { k: number; tx: number; ty: number },
          _newVal: { k: number; tx: number; ty: number },
          _parent: CrossSectionState
        ) => {
          if (this.crossSectionState.zoomUpdate) {
            this.scatterplot?.setZoom(_newVal);
          }
        }
      ),
      this.subscribe('extendedState.crossSection.sectionWidthSettings.value', (_oldVal: number, _newVal: number) => {
        if (_newVal > 0 && this.crossSectionState.linestringCoordinates.length >= 2) {
          this.refreshData(_newVal, this.crossSectionState.linestringCoordinates);
        }
      }),
      this.subscribe(
        'extendedState.crossSection.linestringCoordinates',
        (_oldVal: [number, number][], _newVal: [number, number][], _parent: CrossSectionState) => {
          this.scatterplot?.deleteAllMeasurements();

          if (_newVal.length === 0) {
            this.abortController.abort('Cross-section-viewer: current data fetch was aborted by new request');
            this.scatterplot!.resetPlot();
            this.scatterplotInitialized = false;
            return;
          }

          if (
            this.crossSectionState.sectionWidthSettings.value > 0 &&
            this.crossSectionState.linestringCoordinates.length >= 2
          ) {
            this.refreshData(
              this.crossSectionState.sectionWidthSettings.value,
              this.crossSectionState.linestringCoordinates
            );
          }
        }
      ),

      // Measurement mode
      this.subscribe(
        'extendedState.crossSection.drawMeasurement',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          if (_newVal) {
            // Disable annotation mode to avoid conflict with measurement mode
            this.crossSectionState.drawMarker = false;
          }
          this.scatterplot?.toggleMeasurement(_newVal);
        }
      ),

      // Annotation (marker drawing) mode
      this.subscribe(
        'extendedState.crossSection.drawMarker',
        (_oldVal: boolean, _newVal: boolean, _parent: CrossSectionState) => {
          if (_newVal) {
            // Disable measurement mode to avoid conflict with annotation mode
            this.crossSectionState.drawMeasurement = false;
          }
          this.scatterplot?.toggleAnnotation(_newVal);
        }
      ),

      // Markers array
      this.subscribe(
        'extendedState.crossSection.markers',
        (_oldVal: Marker[], _newVal: Marker[], _parent: CrossSectionState) => {
          this.scatterplot!.markers = _newVal;
          this.scatterplot?.updateMarkers();
          this.scatterplot?.updateMeasurements();
          this.scatterplot?.updateLabels();
        }
      ),

      // Dataset visibility
      this.subscribe(
        /extendedState\.crossSection\.datasets\..*\.active/,
        (_oldActive: boolean, newActive: boolean, _parent: CrossSectionState) => {
          if (newActive) {
            const ds = this.crossSectionState.datasets.find((ds) => ds.active && !ds.isloaded);
            if (ds) {
              this.refreshData(
                this.crossSectionState.sectionWidthSettings.value,
                this.crossSectionState.linestringCoordinates,
                true
              );
              return;
            }
          }
          this.redrawChangedDatasets();
        }
      ),

      // Dataset color by
      this.subscribe(
        /extendedState\.crossSection\.datasets\..*\.(colorby|color)/,
        (_oldColorBy: ColorVariable, _newColorBy: ColorVariable) => {
          // Recolor data slices in‑place
          this.redrawChangedDatasets();
        }
      )
    );

    // Delete all annotations (markers)
    document.addEventListener('delete-markers', () => {
      this.scatterplot?.deleteAllMarkers();
    });

    // Listen to 'delete-measurements' event emitted by the cross-section settings component (CrossSectionSettingsComponent). Delete all measurements when event fires.
    document.addEventListener('delete-measurements', () => {
      this.scatterplot?.deleteAllMeasurements();
    });

    // Listen to 'print-canvas' event emitted by the cross-section settings component (CrossSectionSettingsComponent). Print profile canvas when event fires.
    document.addEventListener('print-canvas', () => {
      this.printCanvas();
    });

    // Listen to 'cursormove' event emitted by the scatterplot. Update cursordomain coordinates in the state manager when event fires.
    this.panel?.addEventListener('cursormove', ((e: CursorMoveEvent) => {
      this.crossSectionState.cursorDomainCoordinates = e.detail.domainCoords;
    }) as EventListener);

    // Changed profile domain (X-Y extent)
    this.panel?.addEventListener('changedomain', ((e: ChangeDomainEvent) => {
      console.debug('Cross-section viewer: changedomain event fired');

      this.crossSectionState.domain = {
        xmin: e.detail.xDomain[0],
        xmax: e.detail.xDomain[1],
        ymin: e.detail.yDomain[0],
        ymax: e.detail.yDomain[1]
      };

      this.crossSectionState.zoomUpdate = false;

      this.crossSectionState.zoom = {
        k: this.scatterplot!.zoomTransform.k,
        tx: this.scatterplot!.zoomTransform.x,
        ty: this.scatterplot!.zoomTransform.y
      };
    }) as EventListener);

    // Listen to changes in Markers array
    this.panel?.addEventListener('changemarkers', ((e: ChangeMarkersEvent) => {
      console.debug('Cross-section viewer: changemarkers event fired');

      const newMarkers = e.detail.markers;
      const current = this.crossSectionState.markers;
      const newIdSet = new Set(newMarkers.map((m) => m.id));

      // Update/add markers
      for (const nm of newMarkers) {
        const existing = current.find((cm) => cm.id === nm.id);
        if (existing) {
          Object.assign(existing, nm);
        } else {
          current.push(nm);
        }
      }

      // Remove deleted markers
      for (let i = current.length - 1; i >= 0; i--) {
        if (!newIdSet.has(current[i].id)) {
          current.splice(i, 1);
        }
      }
    }) as EventListener);

    // Listen to 'changemeasurements' event emitted by the scatterplot. Update measurements array in the state manager when event fires.
    this.panel?.addEventListener('changemeasurements', ((e: ChangeMeasurementsEvent) => {
      console.debug('Cross-section viewer: changemeasurements event fired');
      this.crossSectionState.measurements = e.detail.measurements;
    }) as EventListener);
  }

  unregisterEvents(): void {
    this.unsubscribe(this.eventsCallbacks);
    this.eventsCallbacks.length = 0;
  }

  private registerVisibilityEvents() {
    this.subscribe('interface.crossSectionPanelVisible', (_oldValue: boolean, _newValue: boolean) => {
      this.togglePanel(_newValue);
    });
  }

  private togglePanel(visible: boolean): void {
    this.visible = visible;
    this.render();
  }

  connectedCallback(): void {
    this.render();
    this.registerVisibilityEvents();

    // Load pytree manager
    (async () => {
      try {
        await this.initPytreeManager();
        this.render();
      } catch (err) {
        console.error('PytreeManager loading failed:', err);
      }
    })();
  }
}

export default CrossSectionViewComponent;
