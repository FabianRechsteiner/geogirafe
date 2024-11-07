import type { Callback } from '../../../tools/state/statemanager';
import type { ColorVariable, ColorPalette } from './../crosssectiontypes';
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
  currentRefreshId: symbol | undefined;
  panel: HTMLDivElement | null = null;
  pytreeManager: PytreeManager | null = null;

  constructor() {
    super('cross-section-view');

    this.crossSectionState = this.state.extendedState.crossSection as CrossSectionState;
    this.abortController = new AbortController();

    // Initialize point data attributes
    this.uv = new Float32Array(this.crossSectionState.maxNumberOfPoints * 2); // 4 bytes * 2 values
    this.rgb = new Uint8Array(this.crossSectionState.maxNumberOfPoints * 3); // 1 byte * 3 values
    this.intensity = new Uint16Array(this.crossSectionState.maxNumberOfPoints); // 2 bytes * 1 value
    this.classification = new Uint8Array(this.crossSectionState.maxNumberOfPoints); // 1 bytes * 1 value
  }

  async initPytreeManager() {
    const baseURL = ConfigManager.getInstance().Config.lidar.url.replace(/\/?$/, '/');
    this.pytreeManager = new PytreeManager(baseURL);

    await this.pytreeManager.getConfig();
  }

  async refreshData(lineWidth: number, lineCoordinates: [number, number][]) {
    if (!this.pytreeManager) {
      try {
        await this.initPytreeManager();
      } catch (error) {
        console.error('Cross-section-viewer: Unavble to initialize Pytree manager', error);
        throw error;
      }
    }

    this.scatterplot!.clearGLPoints();

    this.validateRequestArgs(lineWidth, lineCoordinates);

    this.abortOngoingRequest();

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Activate loading status
    this.crossSectionState.loading = true;
    this.state.loading = true;

    // document.getElementById('spinner').style.visibility = 'visible'; // Uncomment to enable spinner

    const coordinateString = lineCoordinates.map((x) => `{${x}}`).join();
    this.crossSectionState.numberOfPoints = 0;

    // Initialize point data arrays
    this.uv = new Float32Array(this.crossSectionState.maxNumberOfPoints * 2); // 4 bytes * 2 values
    this.rgb = new Uint8Array(this.crossSectionState.maxNumberOfPoints * 3); // 1 byte * 3 values
    this.intensity = new Uint16Array(this.crossSectionState.maxNumberOfPoints); // 2 bytes * 1 value
    this.classification = new Uint8Array(this.crossSectionState.maxNumberOfPoints); // 1 bytes * 1 value

    // Create a unique identifier for this refresh operation
    const refreshId = Symbol('refreshId');
    this.currentRefreshId = refreshId;

    let LOD = 1;

    while (this.crossSectionState.numberOfPoints < this.crossSectionState.maxNumberOfPoints && LOD <= 14) {
      try {
        this.crossSectionState.loading = true;
        this.state.loading = true;

        // Asynchronous request to retrieve cross-section data at given level of detail (LOD)
        const response = await this.pytreeManager!.getData(
          this.pytreeManager!.config!.default_point_cloud,
          LOD,
          LOD,
          lineWidth,
          coordinateString,
          this.abortController.signal
        );

        if (!response || signal.aborted || this.currentRefreshId !== refreshId) {
          break;
        }

        const remainder = Math.max(0, this.crossSectionState.maxNumberOfPoints - this.crossSectionState.numberOfPoints);

        // Update data arrays
        if (response.metadata.points > 0 && remainder > 0 && !signal.aborted) {
          for (const key in response.data) {
            switch (key) {
              case 'POSITION_PROJECTED_PROFILE':
                this.uv.set(
                  // @ts-expect-error: D3 typing issue
                  response.data['POSITION_PROJECTED_PROFILE'].slice(0, remainder * 2),
                  this.crossSectionState.numberOfPoints * 2
                );
                break;
              case 'RGB':
                // @ts-expect-error: D3 typing issue
                this.rgb.set(response.data['RGB'].slice(0, remainder * 3), this.crossSectionState.numberOfPoints * 3);
                break;
              case 'INTENSITY':
                this.intensity.set(
                  // @ts-expect-error: D3 typing issue
                  response.data['INTENSITY'].slice(0, remainder),
                  this.crossSectionState.numberOfPoints
                );
                break;
              case 'CLASSIFICATION':
                this.classification.set(
                  // @ts-expect-error: D3 typing issue
                  response.data['CLASSIFICATION'].slice(0, remainder),
                  this.crossSectionState.numberOfPoints
                );
                break;
            }
          }

          this.crossSectionState.numberOfPoints = Math.min(
            this.crossSectionState.maxNumberOfPoints,
            this.crossSectionState.numberOfPoints + response.metadata.points
          );

          this.updateScatterplot(refreshId);
        }

        if (remainder === 0) {
          return;
        }

        LOD++;
      } catch (error) {
        console.error('Cross-section-viewer: Fetch failed due to unexpected error:', error);
        throw error;
      }
    }

    // document.getElementById('spinner').style.visibility = 'hidden'; Uncomment to enable spinner

    // Deactivate loading state when data fetch is complete
    this.crossSectionState.loading = false;
    this.state.loading = false;
  }

  private validateRequestArgs(lineWidth: number, lineCoordinates: [number, number][]) {
    if (lineWidth <= 0.0) {
      throw new Error('lineWidth must be larger than 0');
    }
    if (lineCoordinates.length < 2) {
      throw new Error('At least two line coordinates are required');
    }
  }

  private abortOngoingRequest(): void {
    if (this.crossSectionState.loading) {
      this.abortController.abort('New linestring requested before previous data finished loading');
      this.scatterplot!.clearGLPoints();
      this.crossSectionState.loading = false;
      this.state.loading = false;
    }
    this.abortController = new AbortController();
  }

  private updateScatterplot(refreshId: symbol): void {
    if (this.scatterplot && this.currentRefreshId === refreshId) {
      this.scatterplot.updatePoints(this.uv.slice(0, this.crossSectionState.numberOfPoints * 2));
      this.changeColormap(this.crossSectionState.colorVariable, this.crossSectionState.colorPalette);
      this.scatterplot.updatePlot();
    }
  }

  changeColormap(variable: ColorVariable, colormap: ColorPalette = 'spectral') {
    let colors;
    switch (variable) {
      case 'intensity':
        colors = computeColors(
          this.intensity.slice(0, this.crossSectionState.numberOfPoints),
          colormap,
          [15000, 65000]
        );
        break;
      case 'natural':
        colors = this.rgb.slice(0, this.crossSectionState.numberOfPoints * 3);
        break;
      case 'classification':
        // colors = computeColors(this.classification.slice(0, this.crossSectionState.numberOfPoints), 'custom', [1, 41]);
        colors = this.pytreeManager!.getClassificationColor(
          this.classification.slice(0, this.crossSectionState.numberOfPoints),
          this.pytreeManager!.config!.classification_colors
        );

        break;
      case 'uniform':
        colors = computeColors(
          this.classification.slice(0, this.crossSectionState.numberOfPoints),
          this.crossSectionState.colorUniform,
          []
        );
        break;
    }

    // Update scatterplot
    if (this.scatterplot) {
      this.scatterplot.updateColors(colors);
      this.scatterplot.initializeGL();
      this.scatterplot.updateTransform();
    }
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
    this.visible ? this.renderComponent() : this.renderEmpty();
  }

  private renderComponent() {
    super.render();
    super.girafeTranslate();
    this.activateTooltips(false, [800, 0], 'top-end');

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
        'extendedState.crossSection.colorVariable',
        (_oldVal: string, _newVal: string, _parent: CrossSectionState) => {
          this.changeColormap(this.crossSectionState.colorVariable, this.crossSectionState.colorPalette);
        }
      ),
      this.subscribe(
        'extendedState.crossSection.colorUniform',
        (_oldVal: string, _newVal: string, _parent: CrossSectionState) => {
          if (this.crossSectionState.colorVariable === 'uniform') {
            this.changeColormap(this.crossSectionState.colorVariable, this.crossSectionState.colorPalette);
          }
        }
      ),
      this.subscribe(
        'extendedState.crossSection.colorPalette',
        (_oldVal: string, _newVal: string, _parent: CrossSectionState) => {
          this.changeColormap(this.crossSectionState.colorVariable, this.crossSectionState.colorPalette);
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
      )
    );

    // Delete all annotations (markers)
    /*
    document.addEventListener('delete-markers', () => {
      this.scatterplot?.deleteAllMarkers();
    });
    */

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

    // Listen to 'changemarkers' event emitted by the scatterplot. Update markers array in the state manager when event fires.
    this.panel?.addEventListener('changemarkers', ((e: ChangeMarkersEvent) => {
      console.debug('Cross-section viewer: changemarkers event fired');
      this.crossSectionState.markers = e.detail.markers;
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
  }
}

export default CrossSectionViewComponent;
