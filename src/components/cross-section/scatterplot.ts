import * as d3 from 'd3';
import { v4 as uuidv4 } from 'uuid';

export type Marker = {
  id: string;
  label: string;
  x: number;
  y: number;
  u: number;
  v: number;
  xm: number | null;
  ym: number | null;
  zm: number | null;
  colour: string;
  opacity: number;
  feature: string;
  group: string | null;
  show: boolean;
  update: boolean;
};

export type Measurement = {
  id: string;
  label: string;
  x: number;
  y: number;
  u: number;
  v: number;
  from: string;
  to: string;
  distance: number;
  slope: number;
  text: string | null;
};

export interface CursorMoveEvent extends CustomEvent {
  detail: { rangeCoords: [number, number]; domainCoords: [number, number] };
}

export interface ChangeDomainEvent extends CustomEvent {
  detail: { xDomain: [number, number]; yDomain: [number, number] };
}

export interface ChangeMarkersEvent extends CustomEvent {
  detail: { markers: Marker[] };
}

export interface ChangeMeasurementsEvent extends CustomEvent {
  detail: { measurements: Measurement[] };
}

export class Scatterplot {
  // CLASS VARIABLES - (STATIC PROPERTIES)
  // const – The declaration is of a compile time constant.
  // uniform - per-primitive parameters (constant during an entire draw call) ;
  // attribute - are per-vertex parameters (typically : positions, normals, colors, UVs, ...) ;
  // varying - per-fragment (or per-pixel) parameters : they vary from pixels to pixels.

  // Vertex shader
  private readonly vertexShaderSource: string = `#version 300 es
                // VERTEX SHADER
                in vec2 vertex_position;
                in vec3 vertex_color;
                // in float vertex_classification;
                out lowp vec3 vert_color;
                // out lowp float vert_classification;

                uniform lowp float point_size;
                uniform vec2 offset;
                uniform vec2 range;
                uniform mat4 matrix;
                void main() {
                    vec2 vertex_position_tr = vec2(
                        2.0 * ((vertex_position.x - offset.x) / range.x) - 1.0,
                        2.0 * ((vertex_position.y - offset.y) / range.y) - 1.0
                    );
                   gl_Position = matrix * vec4( vertex_position_tr, 0.0, 1.0 );
                   vert_color = vertex_color;
                   gl_PointSize = point_size; // vertex_classification
                }`;

  // Fragment shader
  private readonly fragmentShaderSource: string = `#version 300 es
                // FRAGMENT SHADER
                precision lowp float;
                in vec3 vert_color;
                out vec4 color;
                void main() {
                    color = vec4( vert_color, 1.0 );
                }`;

  // Default property values
  boundingBox: { xMin: number; xMax: number; yMin: number; yMax: number } = {
    xMin: 0.0,
    xMax: 0.0,
    yMin: 0.0,
    yMax: 0.0
  };
  pointSize: number = 3;
  groupID: string = uuidv4();
  measure: boolean = false;
  draw: boolean = false;
  gridVisible: boolean = true;
  backgroundColor: [number, number, number, number] = [1.0, 1.0, 1.0, 1.0];
  xGridColor: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0];
  yGridColor: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0];
  xDomain: [number, number] = [0, 100];
  yDomain: [number, number] = [0, 100];
  verticalExaggeration: number = 1.0;
  markers: Marker[] = [];
  measurements: Measurement[] = [];
  canvasScalingFactor: number = 3.0;
  cx0: number | null = null;
  cy0: number | null = null;
  x0: number = 0.0;
  y0: number = 0.0;
  annotationPadX: number = 8; // horizontal padding around annotation text
  annotationPadY: number = 4; // vertical padding around annotation text
  annotationGapY: number = 20; // space above the annotation text

  // Property type declarations (without default values)
  parent: HTMLDivElement;
  canvas!: d3.Selection<HTMLCanvasElement, unknown, null, unknown>;
  containerSVG!: d3.Selection<SVGSVGElement, unknown, null, unknown>;

  private readonly margins: { left: number; right: number; top: number; bottom: number };
  private xy: Float32Array;
  private rgb: Uint8Array;
  private drag: unknown;
  private measurementsSVG!: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, undefined>;
  private pointsSVG!: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, unknown>;

  private markerLabelBoxesSVG!: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, unknown>;
  private markerLabelsSVG!: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, unknown>;

  private measurementLabelBoxesSVG!: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, unknown>;
  private measurementLabelsSVG!: d3.Selection<SVGSVGElement, unknown, HTMLElement | null, unknown>;

  private zoom!: d3.ZoomBehavior<Element, unknown> | d3.ZoomBehavior<SVGSVGElement, unknown> | null;
  private xAxis!: d3.Axis<d3.NumberValue>;
  private yAxis!: d3.Axis<d3.NumberValue>;
  private xGrid!: d3.Axis<d3.NumberValue>;
  private yGrid!: d3.Axis<d3.NumberValue>;
  private draggedElement!: SVGCircleElement | null;

  private cursorMoveEvent!: CursorMoveEvent;
  private domainEvent!: CustomEvent;
  private drawEvent!: CustomEvent;
  private measureEvent!: CustomEvent;

  private gl!: WebGL2RenderingContext;
  private shaderProgram!: WebGLProgram;
  private pointsize_uniform!: WebGLUniformLocation;
  private offset_uniform!: WebGLUniformLocation;
  private range_uniform!: WebGLUniformLocation;
  private matrix_uniform!: WebGLUniformLocation;
  private vertex_attrib!: GLint;
  private color_attrib!: GLint;
  private vertexBuffer!: WebGLBuffer;
  private colorBuffer!: WebGLBuffer;
  private indexBuffer!: WebGLBuffer;
  private currentIndex: Uint32Array = new Uint32Array(0);

  public constructor(
    parent: HTMLDivElement,
    margins: { left: number; right: number; top: number; bottom: number },
    xy: Float32Array,
    rgb: Uint8Array
  ) {
    this.parent = parent;
    this.margins = margins;
    this.xy = xy;
    this.rgb = rgb;
    this.initializeD3();
    this.initializeWebGL();
    this.initializeEvents();
  }

  private initializeD3(): void {
    // Add canvas
    this.canvas = d3.select(this.parent).append('canvas').attr('id', 'glcanvas');

    // Add outer SVG
    this.containerSVG = d3
      .select(this.parent)
      .append('svg')
      .attr('id', 'svg-outer')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('overflow', 'visible');

    // Append SVG definitions
    this.containerSVG.append('defs');

    // Definitions - Marker
    this.containerSVG
      .append('marker')
      .attr('id', 'dot')
      .attr('refX', 10)
      .attr('refY', 10)
      .attr('markerWidth', 15)
      .attr('markerHeight', 15)
      .append('circle')
      .attr('cx', 10)
      .attr('cy', 10)
      .attr('r', 1.5)
      .attr('fill', 'red');

    // Definitions - Clipppath
    this.containerSVG
      .append('clipPath')
      .attr('id', 'clip')
      .append('rect')
      .attr('id', 'clipRegion')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', 'red');

    // X axis
    this.appendAxis('svg-x-axis');

    // Y axis
    this.appendAxis('svg-y-axis');

    // X grid
    this.containerSVG
      .append('g')
      .attr('id', 'svg-x-grid')
      .attr('class', 'x axis-grid')
      .attr('pointer-events', 'none')
      .attr('transform', '')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.1)
      .attr('stroke', '#ddeeff')
      .attr('fill', 'none')
      .attr('font-size', 12)
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'middle');

    // Y grid
    this.containerSVG
      .append('g')
      .attr('id', 'svg-y-grid')
      .attr('class', 'y axis-grid')
      .attr('pointer-events', 'none')
      .attr('transform', '')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.1)
      .attr('stroke', '#ddeeff')
      .attr('fill', 'none')
      .attr('font-size', 12)
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'middle');

    // Markers
    this.containerSVG.append('g').attr('id', 'svg-points').attr('clip-path', 'url(#clip)').attr('transform', '');

    // Marker text label boxes
    this.containerSVG
      .append('g')
      .attr('id', 'svg-label-boxes')
      .attr('pointer-events', 'none')
      .attr('transform', '')
      .attr('fill', 'none')
      .attr('clip-path', 'url(#clip)')
      .attr('transform', '');

    // Marker text label group
    this.containerSVG
      .append('g')
      .attr('id', 'svg-labels')
      .attr('font-family', 'sans-serif')
      .attr('clip-path', 'url(#clip)')
      .attr('transform', '');

    // Measurements group
    this.containerSVG
      .append('g')
      .attr('id', 'svg-measurements')
      .attr('class', '')
      .attr('clip-path', 'url(#clip)')
      .attr('transform', '');

    // Measurement labels boxes
    this.containerSVG
      .append('g')
      .attr('id', 'svg-measurement-label-boxes')
      .attr('pointer-events', 'none')
      .attr('clip-path', 'url(#clip)');

    // Measurement labels
    this.containerSVG
      .append('g')
      .attr('id', 'svg-measurement-labels')
      .attr('pointer-events', 'none')
      .attr('font-family', 'sans-serif')
      .attr('clip-path', 'url(#clip)');

    // Initialize D3 axes and grids
    this.xAxis = d3.axisBottom(this.xScale);
    this.yAxis = d3.axisLeft(this.yScale);
    this.xGrid = d3.axisBottom(this.xScale);
    this.yGrid = d3.axisLeft(this.yScale);

    // Initialize drag
    this.drag = d3
      .drag<HTMLElement, Marker>()
      .on('start', (e: d3.D3DragEvent<HTMLElement, Marker, Marker>, d: Marker) => this.dragstarted(e, d))
      .on('drag', (e: d3.D3DragEvent<HTMLElement, Marker, Marker>, d: Marker) => this.dragged(e, d))
      .on('end', (e: d3.D3DragEvent<HTMLElement, Marker, Marker>, d: Marker) => this.dragended(e, d));

    // Initialize SVG measurements
    this.measurementsSVG = d3.select(this.parent).select('#svg-measurements');

    // Initialize SVG points
    this.pointsSVG = d3.select(this.parent).select('#svg-points');

    this.pointsSVG
      .selectAll('circle')
      .data(this.markers.filter((x) => x.show))
      .join('circle')
      .attr('id', function (_d, i) {
        return 'marker-' + i;
      })
      .attr('class', 'point')
      .attr('fill', 'rgb(255,255,0)')
      .attr('fill-opacity', 0.75)
      .attr('stroke', 'red')
      .attr('stroke-width', 1.5)
      .attr('r', 5)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      // @ts-expect-error: D3 typing issue
      .call(this.drag);

    // Initialize SVG marker label boxes
    this.markerLabelBoxesSVG = d3.select(this.parent).select('#svg-label-boxes');

    // Initialize SVG marker labels
    this.markerLabelsSVG = d3.select(this.parent).select('#svg-labels');

    // Initialize SVG measurement label boxes
    this.measurementLabelBoxesSVG = d3.select(this.parent).select('#svg-measurement-label-boxes');

    // Initialize SVG measurement labels
    this.measurementLabelsSVG = d3.select(this.parent).select('#svg-measurement-labels');

    // Initialize canvas element
    this.updateCanvas();

    // Initialize zoom
    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .on('zoom', (e: d3.D3ZoomEvent<HTMLCanvasElement, unknown>) => this.handleZoom(e));

    // Update SVG body
    this.updateBody();

    // Enable Zoom
    d3.select(this.parent).select<SVGSVGElement>('#svg-outer').call(this.zoom).on('dblclick.zoom', null); // disable zoom on double click

    // Update axes and grids
    this.updateXAxis();
    this.updateYAxis();
    this.updateXGrid();
    this.updateYGrid();
  }

  private initializeWebGL(): void {
    // Set WEBGL context
    this.gl = this.canvas.node()!.getContext('webgl2')!;

    // Create buffers
    this.vertexBuffer = this.gl.createBuffer()!;
    this.colorBuffer = this.gl.createBuffer()!;
    this.indexBuffer = this.gl.createBuffer()!;

    // Initialize WEBGL shader
    this.shaderProgram = this.GLProgram(this.gl, this.vertexShaderSource, this.fragmentShaderSource);
    this.gl.useProgram(this.shaderProgram);
    this.vertex_attrib = this.gl.getAttribLocation(this.shaderProgram, 'vertex_position');
    this.color_attrib = this.gl.getAttribLocation(this.shaderProgram, 'vertex_color');
    this.pointsize_uniform = this.gl.getUniformLocation(this.shaderProgram, 'point_size')!;
    this.offset_uniform = this.gl.getUniformLocation(this.shaderProgram, 'offset')!;
    this.range_uniform = this.gl.getUniformLocation(this.shaderProgram, 'range')!;
    this.matrix_uniform = this.gl.getUniformLocation(this.shaderProgram, 'matrix')!;

    // Enable WEBGL attributes
    this.gl.enableVertexAttribArray(this.vertex_attrib);
    this.gl.enableVertexAttribArray(this.color_attrib);

    this.initializeGL();
    this.updateTransform();
  }

  private initializeEvents(): void {
    // Cursor move event
    this.cursorMoveEvent = new CustomEvent('cursormove', {
      detail: { domainCoords: [NaN, NaN], rangeCoords: [NaN, NaN] },
      bubbles: true,
      cancelable: true,
      composed: false
    }) as CursorMoveEvent;

    // Domain change event
    this.domainEvent = new CustomEvent('changedomain', {
      detail: { xDomain: this.xDomain, yDomain: this.yDomain },
      bubbles: true,
      cancelable: true,
      composed: false
    });

    // Annotation (marker) change event
    this.drawEvent = new CustomEvent('changemarkers', {
      detail: { markers: this.markers },
      bubbles: true,
      cancelable: true,
      composed: false
    });

    // Measurement change event
    this.measureEvent = new CustomEvent('changemeasurements', {
      detail: { measurements: this.measurements },
      bubbles: true,
      cancelable: true,
      composed: false
    });

    // Resize observer
    const resizeObs = new ResizeObserver(() => {
      this.updatePlot();

      d3.select(this.parent)
        .select<SVGSVGElement>('#svg-outer')
        .transition()
        .duration(100)
        // @ts-expect-error: D3 typing issue
        .call(this.zoom!.transform, this.zoomTransform);
    });

    resizeObs.observe(this.parent);

    // Cursor move event listener
    d3.select(this.parent)
      .select('#svg-outer')
      .on('mousemove', (event) => {
        // Range space (SVG space) coordinates
        const rangeCoords = d3.pointer(event);

        // Domain space (data space) coordinates
        const domainCoords = [this.xScale.invert(rangeCoords[0]), this.yScale.invert(rangeCoords[1])];

        // Dispatch draw event
        this.cursorMoveEvent.detail.rangeCoords = rangeCoords as [number, number];
        this.cursorMoveEvent.detail.domainCoords = domainCoords as [number, number];
        this.parent.dispatchEvent(this.cursorMoveEvent);
      });

    // Click event listener
    d3.select(this.parent)
      .select('#svg-outer')
      .on('click', (event) => {
        // Number of clicks
        const nclicks = event.detail;

        // Range space (SVG space) coordinates
        const rangeCoords = d3.pointer(event);

        // Domain space (data space) coordinates
        const domainCoords = [this.xScale.invert(rangeCoords[0]), this.yScale.invert(rangeCoords[1])];

        if (this.draw) {
          const uuid = uuidv4();

          // add Marker
          this.markers.push({
            id: uuid,
            label: this.generateId(this.markers),
            x: domainCoords[0],
            y: domainCoords[1],
            u: rangeCoords[0],
            v: rangeCoords[1],
            xm: null,
            ym: null,
            zm: null,
            colour: '#FFFFFF',
            opacity: 1.0,
            feature: 'marker',
            group: null,
            show: true,
            update: true
          });

          // Append SVG marker
          this.appendMarker(uuid, rangeCoords);

          // Dispatch draw event
          this.drawEvent.detail.markers = this.markers;
          this.parent.dispatchEvent(this.drawEvent);
        }

        if (this.measure) {
          // Start a new measurement when the user double clicks
          if (nclicks === 2) {
            // Append an SVG path to the plot
            this.groupID = uuidv4();
            this.addMeasurement(this.groupID);
            return;
          }

          // Start a new measurement if the are no existing measurements
          if (this.measurementPoints.length === 0) {
            // Append an SVG path to the plot
            this.groupID = uuidv4();
            this.addMeasurement(this.groupID);
          }

          // Add a new marker to the array of markers
          const uuid = uuidv4();

          this.markers.push({
            id: uuid,
            label: this.generateId(this.markers),
            x: domainCoords[0],
            y: domainCoords[1],
            u: rangeCoords[0],
            v: rangeCoords[1],
            xm: null,
            ym: null,
            zm: null,
            colour: '#FFFFFF',
            opacity: 1.0,
            feature: 'measurement',
            group: `${this.groupID}`,
            show: true,
            update: true
          });

          // Append an SVG marker to the plot
          this.appendMarker(uuid, rangeCoords);

          // Update the array of measurements
          this.updateMeasurements();

          // Update current SVG measurement path
          this.measurementsSVG
            .select(`#path-${this.groupID}`)
            .datum(this.markers.filter((x) => x.group === this.groupID))
            .attr(
              'd',
              d3
                .line<Marker>()
                .x((d) => this.xScale(d.x))
                .y((d) => this.yScale(d.y))
            );

          // Dispatch draw event
          this.drawEvent.detail.markers = this.markers;
          this.parent.dispatchEvent(this.drawEvent);

          // Dispatch measure event
          this.measureEvent.detail.measurements = this.measurements;
          this.parent.dispatchEvent(this.measureEvent);
        }
        this.updateLabels();
      });
  }

  get measurementPoints(): Marker[] {
    return this.markers.filter((x) => x.feature === 'measurement');
  }

  get height(): number {
    return this.parent.clientHeight;
  }

  get width(): number {
    return this.parent.clientWidth;
  }

  get innerWidth(): number {
    return this.width - this.margins.left - this.margins.right;
  }

  get innerHeight(): number {
    return this.height - this.margins.top - this.margins.bottom;
  }

  get xRange(): [number, number] {
    return [0, this.innerWidth];
  }

  get yRange(): [number, number] {
    return [this.innerHeight, 0];
  }

  get domainWidth(): number {
    return this.xDomain[1] - this.xDomain[0];
  }

  get domainHeight(): number {
    return this.verticalExaggeration * (this.yDomain[1] - this.yDomain[0]);
  }

  get domainAspectRatio(): number {
    return this.domainWidth / this.domainHeight;
  }

  get rangeAspectRatio(): number {
    return this.innerWidth / this.innerHeight;
  }

  get xDomainAdjusted(): [number, number] {
    if (this.domainAspectRatio <= this.rangeAspectRatio) {
      return [this.boundingBox.xMin, this.rangeAspectRatio * this.domainHeight + this.boundingBox.xMin];
    } else {
      return this.xDomain;
    }
  }

  get yDomainAdjusted(): [number, number] {
    if (this.domainAspectRatio > this.rangeAspectRatio) {
      return [
        this.boundingBox.yMin,
        this.boundingBox.yMin + this.domainWidth / (this.verticalExaggeration * this.rangeAspectRatio)
      ];
    } else {
      return this.yDomain;
    }
  }

  get xScale(): d3.ScaleLinear<number, number> {
    return this.zoomTransform.rescaleX(d3.scaleLinear(this.xDomainAdjusted, this.xRange));
  }

  get yScale(): d3.ScaleLinear<number, number> {
    return this.zoomTransform.rescaleY(d3.scaleLinear(this.yDomainAdjusted, this.yRange));
  }

  get nPoints(): number {
    return this.xy.length / 2;
  }

  get zoomTransform(): d3.ZoomTransform {
    const selection = d3.select(this.parent).select<SVGSVGElement>('#svg-outer');

    const node = selection.node();
    if (node) {
      return d3.zoomTransform(node);
    } else {
      return d3.zoomIdentity;
    }
  }

  updateBody(): void {
    d3.select(this.parent)
      .select('#svg-outer')
      .attr('width', this.innerWidth)
      .attr('height', this.innerHeight)
      .attr('viewBox', [0, 0, this.innerWidth, this.innerHeight])
      .style('top', `${this.margins.top}px`)
      .style('left', `${this.margins.left}px`);
  }

  updateCanvas(): void {
    d3.select(this.parent)
      .select('#glcanvas')
      .attr('width', this.canvasScalingFactor * this.innerWidth)
      .attr('height', this.canvasScalingFactor * this.innerHeight)
      .style('top', `${this.margins.top}px`)
      .style('left', `${this.margins.left}px`)
      .style('width', `${this.innerWidth}px`)
      .style('height', `${this.innerHeight}px`);
  }

  appendAxis(id: string): void {
    this.containerSVG
      .append('g')
      .attr('id', id)
      .attr('class', 'svg-axis')
      .attr('pointer-events', 'none')
      .attr('transform', '')
      .attr('fill', 'none')
      .attr('font-size', 12)
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'middle')
      .attr('style', 'color: var(--text-color)');
  }

  updateXAxis(): void {
    this.xAxis = d3.axisBottom(this.xScale);
    d3.select(this.parent)
      .select<SVGSVGElement>('#svg-x-axis')
      .attr('transform', `translate(${0}, ${this.innerHeight})`)
      .call(this.xAxis);
  }

  updateYAxis(): void {
    this.yAxis = d3.axisLeft(this.yScale);

    d3.select(this.parent)
      .select<SVGSVGElement>('#svg-y-axis')
      .attr('transform', `translate(${0}, ${0})`)
      .call(this.yAxis);
  }

  updateXGrid(): void {
    this.xGrid = d3
      .axisBottom(this.xScale)
      .tickSize(-this.innerHeight)
      .tickFormat(() => ''); // .ticks(width / 80)

    d3.select(this.parent)
      .select<SVGSVGElement>('#svg-x-grid')
      .attr('transform', `translate(${0}, ${this.innerHeight})`)
      .call(this.xGrid);
  }

  updateYGrid(): void {
    this.yGrid = d3
      .axisLeft(this.yScale)
      .tickSize(-this.innerWidth)
      .tickFormat(() => ''); // .ticks(height / 60)

    d3.select(this.parent)
      .select<SVGSVGElement>('#svg-y-grid')
      .attr('transform', `translate(${0}, ${0})`)
      .call(this.yGrid);
  }

  updateBoundingBox(): void {
    const x = new Float32Array(this.nPoints);
    const y = new Float32Array(this.nPoints);
    for (let i = 0; i < this.nPoints; i++) {
      x[i] = this.xy[2 * i + 0];
      y[i] = this.xy[2 * i + 1];
    }

    this.boundingBox = {
      xMin: x.reduce((acc, current) => Math.min(acc, current)),
      xMax: x.reduce((acc, current) => Math.max(acc, current)),
      yMin: y.reduce((acc, current) => Math.min(acc, current)),
      yMax: y.reduce((acc, current) => Math.max(acc, current))
    };
  }

  updatePoints(xy: Float32Array): void {
    this.xy = xy;
    // Upload new positions into the vertex buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.xy, this.gl.STATIC_DRAW);

    this.updateBoundingBox();
    this.xDomain = [this.boundingBox.xMin, this.boundingBox.xMax];
    this.yDomain = [this.boundingBox.yMin, this.boundingBox.yMax];
  }

  updateColors(rgb: Uint8Array): void {
    this.rgb = rgb;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.rgb, this.gl.STATIC_DRAW);
  }

  updateColorsSlice(slice: Uint8Array, offset: number) {
    this.rgb.set(slice, offset * 3);
    // Update the color buffer partially
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferSubData(
      this.gl.ARRAY_BUFFER,
      offset * 3, // byte offset
      slice
    );
  }

  updateIndex(index: Uint32Array) {
    this.currentIndex = index;
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, index, this.gl.STATIC_DRAW);
  }

  updatePaths(): void {
    const paths = this.measurementsSVG.selectAll('path');
    paths.nodes().forEach((pathNode) => {
      const path = d3.select(pathNode);
      const pathNodes = this.markers.filter((x) => `path-${x.group}` === path.attr('id'));
      path.datum(pathNodes).attr(
        'd',
        d3
          .line<Marker>()
          .x((d) => this.xScale(d.x))
          .y((d) => this.yScale(d.y))
      );
    });
  }

  updateMarkers(): void {
    this.pointsSVG
      .selectAll('circle')
      .data(this.markers.filter((x: Marker) => x.show))
      .join('circle')
      .attr('id', (d: Marker) => `marker-${d.id}`)
      .attr('class', 'point')
      .attr('fill', 'rgb(255,255,0)')
      .attr('fill-opacity', 0.75)
      .attr('stroke', 'red')
      .attr('stroke-width', 1.5)
      .attr('r', 5)
      .attr('cx', (d: Marker) => this.xScale(d.x))
      .attr('cy', (d: Marker) => this.yScale(d.y))
      // @ts-expect-error: D3 typing issue
      .call(this.drag);
  }

  appendMarker(id: string, coords: [number, number]): void {
    this.pointsSVG
      .selectAll('circle')
      .data(this.markers.filter((x: Marker) => x.show))
      .enter()
      .append('circle')
      .attr('id', id)
      .attr('class', 'point')
      .attr('fill', 'rgb(255,255,0)')
      .attr('fill-opacity', 0.75)
      .attr('stroke', 'red')
      .attr('stroke-width', 1.5)
      .attr('r', 5)
      .attr('cx', coords[0])
      .attr('cy', coords[1])
      .attr('cursor', 'grab')
      // @ts-expect-error: D3 typing issue
      .call(this.drag);
  }

  updateMeasurements(): void {
    // Clear all elements in measurements array
    this.measurements.splice(0, this.measurements.length);

    // Update measurements
    for (let i = 0; i < this.markers.length - 1; i++) {
      if (this.markers[i].feature === 'measurement') {
        if (this.markers[i].group === this.markers[i + 1].group) {
          const dx = this.markers[i].x - this.markers[i + 1].x;
          const dy = this.markers[i].y - this.markers[i + 1].y;
          // this.measurements[i].cl = this.measurements[i - 1].cl + this.measurements[i].dl // cumulative length

          this.measurements.push({
            id: this.markers[i].group!,
            label: this.generateId(this.markers),
            x: (this.markers[i].x + this.markers[i + 1].x) / 2,
            y: (this.markers[i].y + this.markers[i + 1].y) / 2,
            u: (this.markers[i].u + this.markers[i + 1].u) / 2,
            v: (this.markers[i].v + this.markers[i + 1].v) / 2,
            from: this.markers[i].id,
            to: this.markers[i + 1].id,
            distance: Math.sqrt(dx * dx + dy * dy),
            slope: dy / dx,
            text: null
          });
        }
      }
    }

    // Update SVG measurement paths
    this.updatePaths();
  }

  printMeasurementLabel(distance: number, slope: number): string {
    let label;
    if (Number.isFinite(slope)) {
      label = `${distance.toFixed(2)} m | ${(100 * slope).toFixed(2)}%`;
    } else {
      label = `${distance.toFixed(2)} m`;
    }
    return label;
  }

  updateLabels(): void {
    // Update SVG marker text labels
    const markerBoxSizes = new Map<string, { w: number; h: number }>();

    this.markerLabelsSVG
      .selectAll<SVGTextElement, Marker>('text')
      .data(
        this.markers.filter((x) => x.show),
        (d) => d.id
      )
      .join('text')
      .attr('id', (d) => `label-${d.id}`)
      .attr('x', (d) => this.xScale(d.x))
      .attr('y', (d) => this.yScale(d.y) - this.annotationGapY)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'text-before-edge')
      .attr('pointer-events', 'none')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 16)
      .attr('fill', 'white')
      .text((d) => `${d.label}`)
      .each(function (d) {
        const b = (this as SVGTextElement).getBBox();
        markerBoxSizes.set(d.id, { w: b.width, h: b.height });
      })
      .attr('y', (d) => this.yScale(d.y) - this.annotationGapY - (markerBoxSizes.get(d.id)?.h ?? 0) / 2);

    this.markerLabelBoxesSVG
      .selectAll<SVGRectElement, Marker>('rect')
      .data(
        this.markers.filter((x) => x.show),
        (d) => d.id
      )
      .join('rect')
      .attr('id', (d) => `label-box-${d.id}`)
      .attr('x', (d) => this.xScale(d.x) - (markerBoxSizes.get(d.id)?.w ?? 0) / 2 - this.annotationPadX)
      .attr(
        'y',
        (d) => this.yScale(d.y) - this.annotationGapY - (markerBoxSizes.get(d.id)?.h ?? 0) / 2 - this.annotationPadY
      )
      .attr('width', (d) => (markerBoxSizes.get(d.id)?.w ?? 0) + 2 * this.annotationPadX)
      .attr('height', (d) => (markerBoxSizes.get(d.id)?.h ?? 0) + 2 * this.annotationPadY)
      .attr('rx', 4)
      .attr('pointer-events', 'none')
      .attr('fill', 'black')
      .attr('fill-opacity', 0.7)
      .attr('stroke', 'white')
      .attr('stroke-width', '1px');

    const measurementBoxSizes = new Map<string, { w: number; h: number }>();

    this.measurementLabelsSVG
      .selectAll<SVGTextElement, Measurement>('text')
      .data(this.measurements, (d) => d.id)
      .join('text')
      .attr('id', (d) => `mlabel-${d.id}`)
      .attr('x', (d) => this.xScale(d.x))
      .attr('y', (d) => this.yScale(d.y))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('pointer-events', 'none')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 18)
      .attr('font-weight', 'bolder')
      .attr('fill', '#ffffffff')
      .text((d) => this.printMeasurementLabel(d.distance, d.slope))
      // .text((d) => `${d.distance.toFixed(2)} m | ${(100 * d.slope).toFixed(2)}%`)
      .each(function (d) {
        const b = (this as SVGTextElement).getBBox();
        measurementBoxSizes.set(d.id, { w: b.width, h: b.height });
      });

    this.measurementLabelBoxesSVG
      .selectAll<SVGRectElement, Measurement>('rect')
      .data(this.measurements, (d) => d.id)
      .join('rect')
      .attr('id', (d) => `mlabel-box-${d.id}`)
      .attr('x', (d) => this.xScale(d.x) - (measurementBoxSizes.get(d.id)?.w ?? 0) / 2 - this.annotationPadX)
      .attr('y', (d) => this.yScale(d.y) - (measurementBoxSizes.get(d.id)?.h ?? 0) / 2 - this.annotationPadY)
      .attr('width', (d) => (measurementBoxSizes.get(d.id)?.w ?? 0) + 2 * this.annotationPadX)
      .attr('height', (d) => (measurementBoxSizes.get(d.id)?.h ?? 0) + 2 * this.annotationPadY)
      .attr('rx', 0)
      .attr('pointer-events', 'none')
      .attr('fill', 'black')
      .attr('fill-opacity', 0.7)
      .attr('stroke', 'white')
      .attr('stroke-width', '1px');
  }

  setGridVisibility(val: boolean): void {
    this.gridVisible = val;
    const display = val ? '' : 'none';
    d3.select(this.parent).select<SVGGElement>('#svg-x-grid').style('display', display);
    d3.select(this.parent).select<SVGGElement>('#svg-y-grid').style('display', display);
  }

  setBackgroundColor(val: string) {
    const color = d3.rgb(val);
    this.backgroundColor = [color.r / 255, color.g / 255, color.b / 255, color.opacity];

    this.gl.clearColor(
      this.backgroundColor[0],
      this.backgroundColor[1],
      this.backgroundColor[2],
      this.backgroundColor[3]
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.updateTransform();
  }

  handleZoom(_e: d3.D3ZoomEvent<HTMLCanvasElement, unknown>): void {
    this.updatePlot();
    this.updateTransform();

    // Dispatch domain change (Zoom/Pan) event
    this.domainEvent.detail.xDomain = this.xScale.domain();
    this.domainEvent.detail.yDomain = this.yScale.domain();
    this.parent.dispatchEvent(this.domainEvent);
  }

  setZoom(tf: { k: number; tx: number; ty: number }): void {
    const zoom = new d3.ZoomTransform(tf.k, tf.tx, tf.ty);

    d3.select(this.parent)
      .select('#svg-outer')
      .transition()
      .duration(100)
      // @ts-expect-error: D3 typing issue
      .call(this.zoom!.transform, zoom);
  }

  resetZoom(): void {
    d3.select(this.parent)
      .select('#svg-outer')
      .transition()
      .duration(100)
      // @ts-expect-error: D3 typing issue
      .call(this.zoom!.transform, d3.zoomIdentity);
  }

  getDraggedElement(event: Event): SVGCircleElement {
    const path = event.composedPath();
    // Return the first element in the path that is an instance of SVGCircleElement
    return path.find((el) => el instanceof SVGCircleElement) as SVGCircleElement;
  }

  updateDraggedElements(e: d3.D3DragEvent<HTMLElement, Marker, Marker>, _d: Marker): void {
    const cx0: number = this.xScale(this.x0);
    const cy0: number = this.yScale(this.y0);
    _d.u = cx0 + e.x - this.x0;
    _d.v = cy0 + e.y - this.y0;
    _d.x = this.xScale.invert(_d.u);
    _d.y = this.yScale.invert(_d.v);
    _d.update = true;

    this.updateMeasurements();
    this.updateLabels();

    // Update dragged SVG element position
    d3.select(this.draggedElement).attr('cx', _d.u).attr('cy', _d.v);

    // Render SVG measurement path
    this.measurementsSVG
      // .selectAll("path")
      .select(`#path-${_d.group}`)
      .attr('stroke', 'rgba(255,140,0,0.5)')
      .attr(
        'd',
        // @ts-expect-error: D3 typing issue
        d3
          .line<Marker>()
          .x((d: Marker) => this.xScale(d.x))
          .y((d: Marker) => this.yScale(d.y))
      );

    // Dispatch draw event
    this.drawEvent.detail.markers = this.markers;
    this.parent.dispatchEvent(this.drawEvent);
  }

  // Drag start callback
  dragstarted(e: d3.D3DragEvent<HTMLElement, Marker, Marker>, _d: Marker): void {
    this.draggedElement = this.getDraggedElement(e.sourceEvent);
    // Access the component context
    this.cx0 = this.xScale(_d.x);
    this.cy0 = this.yScale(_d.y);
    this.x0 = _d.x;
    this.y0 = _d.y;

    // Change the mouse cursor to grabbing
    d3.select(this.draggedElement).attr('cursor', 'grabbing');
  }

  // Drag ongoing callback
  dragged(e: d3.D3DragEvent<HTMLElement, Marker, Marker>, _d: Marker): void {
    this.updateDraggedElements(e, _d);
    d3.select(this.draggedElement).attr('cursor', 'grabbing');
  }

  // Drag end callback
  dragended(e: d3.D3DragEvent<HTMLElement, Marker, Marker>, _d: Marker): void {
    this.updateDraggedElements(e, _d);
    d3.select(this.draggedElement).attr('cursor', 'grab');
  }

  updatePointSize(val: number): void {
    if (typeof val === 'number') {
      this.pointSize = val;
      this.updatePlot();
      this.updateTransform();
    }
  }

  updateVerticalExaggeration(val: number): void {
    if (typeof val === 'number') {
      this.verticalExaggeration = val;
      this.updatePlot();
      this.updateTransform();
    }
  }

  toggleAnnotation(val: boolean): void {
    this.draw = val;
    this.measure = false;
    d3.select(this.parent)
      .select('#svg-outer')
      .attr('cursor', this.draw ? 'crosshair' : 'default');
  }

  deleteAllMarkers(): void {
    if (this.markers.length === 0) {
      return;
    }

    this.markers.splice(0, this.markers.length);
    this.pointsSVG.selectAll('*').remove();
    this.markerLabelsSVG.selectAll('*').remove();
    this.markerLabelBoxesSVG.selectAll('*').remove();

    // Delete SVG paths
    this.measurementsSVG.selectAll('*').remove();

    // Delete SVG labels
    this.measurementLabelsSVG.selectAll('*').remove();
    this.measurementLabelBoxesSVG.selectAll('*').remove();

    this.updateMeasurements();

    // Dispatch draw event
    this.drawEvent.detail.markers = this.markers;
    this.parent.dispatchEvent(this.drawEvent);
  }

  deleteMarker(id: string): void {
    const target = this.markers.find((obj: Marker) => obj.id === id);
    if (target) {
      // Delete marker data
      const index = this.markers.findIndex((el: Marker) => el.id === id);
      if (index !== -1) {
        this.markers.splice(index, 1);
      }

      // Delete SVG element
      this.pointsSVG.select(`#marker-${id}`).remove();

      this.updateMeasurements();
      this.updateLabels();

      // Update SVG path in measurement group
      this.measurementsSVG
        .select(`#path-${target.group}`)
        .datum(this.markers.filter((x) => x.group === target.group))
        .attr(
          'd',
          d3
            .line<Marker>()
            .x((d) => this.xScale(d.x))
            .y((d) => this.yScale(d.y))
        );
    }

    // Delete marker label by ID
    this.markerLabelsSVG.select(`#label-${id}`).remove();

    // Delete marker label box by ID
    this.markerLabelBoxesSVG.select(`#label-box-${id}`).remove();

    // Dispatch draw event
    this.drawEvent.detail.markers = this.markers;
    this.parent.dispatchEvent(this.drawEvent);
  }

  toggleMeasurement(val: boolean): void {
    this.measure = val;
    this.draw = false;
    d3.select(this.parent)
      .select('#svg-outer')
      .attr('cursor', this.measure ? 'crosshair' : 'default');
  }

  addMeasurement(id: string): void {
    this.measurementsSVG
      .append('path')
      .attr('id', `path-${id}`)
      .attr('class', 'line')
      .attr('clip-path', 'url(#clip)')
      .attr('pointer-events', 'none')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke', 'rgba(255,140,0,0.5)')
      .attr('marker-start', 'url(#dot)')
      .attr('marker-mid', 'url(#dot)')
      .attr('marker-end', 'url(#dot)')
      .datum(this.markers.filter((x) => x.group === id))
      .attr(
        'd',
        d3
          .line<Marker>()
          .x((d) => this.xScale(d.x))
          .y((d) => this.yScale(d.y))
      );
  }

  deleteAllMeasurements(): void {
    if (this.measurements.length === 0) {
      return;
    }

    // Clear all elements in array, but keep reference
    this.measurements.splice(0, this.measurements.length);

    // Delete SVG measurement paths
    this.measurementsSVG.selectAll('*').remove();

    // Delete SVG measurement labels
    this.measurementLabelsSVG.selectAll('*').remove();

    // Delete SVG measurement label boxes
    this.measurementLabelBoxesSVG.selectAll('*').remove();

    // Reset measurement group ID
    this.groupID = uuidv4();

    // Remove measurements from array of markers
    for (let i = this.markers.length - 1; i >= 0; i--) {
      if (this.markers[i].feature === 'measurement') {
        this.markers.splice(i, 1);
      }
    }

    this.updateMarkers();
    this.updateLabels();

    // Dispatch draw event
    this.drawEvent.detail.markers = this.markers;
    this.parent.dispatchEvent(this.drawEvent);

    // Dispatch measure event
    this.measureEvent.detail.measurements = this.measurements;
    this.parent.dispatchEvent(this.measureEvent);
  }

  updatePlot(): void {
    // Canvas
    this.updateCanvas();

    // Body
    this.updateBody();

    // X-axis
    this.updateXAxis();

    // Y-axis
    this.updateYAxis();

    // X-grid
    this.updateXGrid();

    // Y-grid
    this.updateYGrid();

    // Markers
    this.updateMarkers();

    // Measurements
    this.updateMeasurements();

    // Labels
    this.updateLabels();
  }

  resetPlot(): void {
    // Clear point coordinates and colors
    this.xy = new Float32Array(0);
    this.rgb = new Uint8Array(0);

    // Clear GL points
    this.clearGLPoints();

    // Reset zoom
    this.resetZoom();

    this.markers.forEach((_el: Marker, _i: number) => {
      _el.show = false;
    });

    // DISPATCH DRAW EVENT
    this.drawEvent.detail.markers = this.markers;
    this.parent.dispatchEvent(this.drawEvent);
  }

  generateId(markers: Marker[]): string {
    let id = 1;
    const existingIds = new Set(markers.map((marker) => parseInt(marker.label)));

    while (existingIds.has(id)) {
      id++;
    }
    return id.toString();
  }

  clearGLPoints(): void {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  initializeGL(): void {
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clearColor(
      this.backgroundColor[0],
      this.backgroundColor[1],
      this.backgroundColor[2],
      this.backgroundColor[3]
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Position buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.xy, this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(this.vertex_attrib, 2, this.gl.FLOAT, false, 0, 0);

    // Color buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.rgb, this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(this.color_attrib, 3, this.gl.UNSIGNED_BYTE, true, 0, 0);

    // Index buffer
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, 0, this.gl.STATIC_DRAW);
  }

  // Multiply two 4x4 matrices
  multiplyMatrix(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; ++i) {
      for (let j = 0; j < 4; ++j) {
        out[i * 4 + j] =
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    return out;
  }

  createOrthographic(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): Float32Array {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    const out = new Float32Array(16);

    out[0] = -2 * lr;
    out[5] = -2 * bt;
    out[10] = 2 * nf;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
  }

  createTranslation(tx: number, ty: number, tz: number): Float32Array {
    const out = new Float32Array(16);
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[12] = tx;
    out[13] = ty;
    out[14] = tz;
    out[15] = 1;
    return out;
  }

  createScale(sx: number, sy: number, sz: number): Float32Array {
    const out = new Float32Array(16);
    out[0] = sx;
    out[5] = sy;
    out[10] = sz;
    out[15] = 1;
    return out;
  }

  updateTransform(): void {
    const k = this.zoomTransform.k;
    const tx = this.zoomTransform.x;
    const ty = this.zoomTransform.y;
    const sfac = 1 / this.canvasScalingFactor;

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // Create an orthographic matrix
    let matrix: Float32Array = this.createOrthographic(
      0,
      sfac * this.gl.canvas.width,
      sfac * this.gl.canvas.height,
      0,
      -1,
      1
    );

    // Apply translation matrix
    const translationMatrix: Float32Array = this.createTranslation(tx, ty, 0);
    matrix = this.multiplyMatrix(translationMatrix, matrix);

    // Apply scaling (zoom) matrix
    const scaleMatrix: Float32Array = this.createScale(k, k, 1);
    matrix = this.multiplyMatrix(scaleMatrix, matrix);

    // Translate the unit quad to the center
    const centerTranslationMatrix: Float32Array = this.createTranslation(
      (sfac * this.gl.canvas.width) / 2,
      (sfac * this.gl.canvas.height) / 2,
      0
    );
    matrix = this.multiplyMatrix(centerTranslationMatrix, matrix);

    // Scale the unit quad to be half the size of the canvas
    const halfScaleMatrix: Float32Array = this.createScale(
      (sfac * this.gl.canvas.width) / 2,
      (sfac * this.gl.canvas.height) / 2,
      1
    );
    matrix = this.multiplyMatrix(halfScaleMatrix, matrix);

    // Flip the Y axis (for WebGL default coordinate system)
    const flipYMatrix: Float32Array = this.createScale(1, -1, 1);
    matrix = this.multiplyMatrix(flipYMatrix, matrix);

    this.gl.uniformMatrix4fv(this.matrix_uniform, false, matrix);

    // NOTE: The range and offset do not vary for webgl, perhaps apply to data directly instead of recomputing
    // in shader at every view transform
    const offset = new Float32Array([this.xDomainAdjusted[0], this.yDomainAdjusted[0]]);
    const range = new Float32Array([
      this.xDomainAdjusted[1] - this.xDomainAdjusted[0],
      this.yDomainAdjusted[1] - this.yDomainAdjusted[0]
    ]);

    this.gl.uniform2fv(this.offset_uniform, offset);
    this.gl.uniform2fv(this.range_uniform, range);
    this.gl.uniform1f(this.pointsize_uniform, this.pointSize);

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawElements(this.gl.POINTS, this.currentIndex.length, this.gl.UNSIGNED_INT, 0);
  }

  GLShader(gl: WebGL2RenderingContext, type: GLenum, code: string): WebGLShader {
    const shader: WebGLShader = gl.createShader(type)!;
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    return shader;
  }

  GLProgram(gl: WebGL2RenderingContext, vertex_source: string, fragment_source: string): WebGLProgram {
    const shader_program = gl.createProgram();
    const vertex_shader = this.GLShader(gl, gl.VERTEX_SHADER, vertex_source);
    const fragment_shader = this.GLShader(gl, gl.FRAGMENT_SHADER, fragment_source);

    if (!shader_program) {
      throw new Error('GLProgram: Invalid shader program');
    }

    if (!vertex_shader) {
      throw new Error('GLProgram: Invalid vertex shader');
    }

    if (!fragment_shader) {
      throw new Error('GLProgram: Invalid fragment shader');
    }

    gl.attachShader(shader_program, vertex_shader);
    gl.attachShader(shader_program, fragment_shader);
    gl.linkProgram(shader_program);

    gl.deleteShader(vertex_shader);
    gl.deleteShader(fragment_shader);

    return shader_program;
  }
}
