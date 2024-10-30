type ClassificationColor = {
  color: string;
  name: string;
  value: string;
  visible: number;
};

type PointAttribute = {
  name: string;
  value: string;
  elements: number;
  bytes: number;
  visible: number;
};

type MaxLevel = {
  max: number;
  width: number;
};

export type PytreeConfig = {
  debug: boolean;
  gmf_url: string;
  pointclouds: string[];
  default_point_cloud: string;
  width: number;
  point_size: number;
  max_point_number: number;
  vertical_pan_tolerance: number;
  initialLOD: number;
  classification_colors: { [key: string]: ClassificationColor };
  default_color: string;
  default_attribute: string;
  default_point_attribute: string;
  point_attributes: { [key: string]: PointAttribute };
  max_levels: { [key: string]: MaxLevel };
};

// Types
export type PotreePointAttribute =
  | 'POSITION_CARTESIAN'
  | 'RGB'
  | 'COLOR_PACKED'
  | 'INTENSITY'
  | 'CLASSIFICATION'
  | 'POSITION_PROJECTED_PROFILE';

export type PotreeMetadata = {
  boundingBox: { lx: number; ly: number; lz: number; ux: number; uy: number; uz: number };
  bytesPerPoint: number;
  durationMS: number;
  nodesProcessed: number;
  pointAttributes: PotreePointAttribute[];
  points: number;
  pointsProcessed: number;
  scale: number;
};

export class PytreeManager {
  baseURL: string;
  config: PytreeConfig | null = null;
  constructor(theBaseURL: string) {
    this.baseURL = theBaseURL;
  }

  // Get Pytree configuration from remote server
  async getConfig() {
    const configURL = new URL('./profile/config', this.baseURL);
    try {
      const response = await fetch(configURL);

      if (!response.ok) {
        throw new Error(`PytreeManager: HTTP error! Status: ${response.status}`);
      }
      this.config = await response.json();
    } catch (_error) {
      console.error('PytreeManager:', _error);
    }
  }

  private readPotreeAttributes(
    metadata: PotreeMetadata,
    metadataSize: number,
    numPoints: number,
    fullBuffer: ArrayBuffer,
    attributes: PotreePointAttribute[]
  ) {
    // const tStart = performance.now();

    const pointOffset = 4 + metadataSize;
    let attributeOffset = 0;
    const view = new DataView(fullBuffer);
    const scale = metadata.scale;
    const min = {
      x: metadata.boundingBox.lx,
      y: metadata.boundingBox.ly,
      z: metadata.boundingBox.lz
    };
    const bpp = metadata.bytesPerPoint;

    const buffers = {};

    for (const attribute of attributes) {
      if (attribute === 'POSITION_CARTESIAN') {
        const array = new Float64Array(3 * numPoints);

        for (let i = 0; i < numPoints; i++) {
          const X = view.getInt32(pointOffset + i * bpp + attributeOffset + 0, true);
          const Y = view.getInt32(pointOffset + i * bpp + attributeOffset + 4, true);
          const Z = view.getInt32(pointOffset + i * bpp + attributeOffset + 8, true);

          const x = X * scale + min.x;
          const y = Y * scale + min.y;
          const z = Z * scale + min.z;

          array[3 * i + 0] = x;
          array[3 * i + 1] = y;
          array[3 * i + 2] = z;
        }

        attributeOffset += 12;
        // @ts-expect-error: D3 typing issue
        buffers[attribute] = array;
      } else if (attribute === 'RGB') {
        const array = new Uint8Array(3 * numPoints);

        for (let i = 0; i < numPoints; i++) {
          const r = view.getUint8(pointOffset + i * bpp + attributeOffset + 0);
          const g = view.getUint8(pointOffset + i * bpp + attributeOffset + 1);
          const b = view.getUint8(pointOffset + i * bpp + attributeOffset + 2);

          array[3 * i + 0] = r;
          array[3 * i + 1] = g;
          array[3 * i + 2] = b;
        }

        attributeOffset += 3;
        // @ts-expect-error: D3 typing issue
        buffers[attribute] = array;
      } else if (attribute === 'COLOR_PACKED') {
        const array = new Uint8Array(4 * numPoints);

        for (let i = 0; i < numPoints; i++) {
          const r = view.getUint8(pointOffset + i * bpp + attributeOffset + 0);
          const g = view.getUint8(pointOffset + i * bpp + attributeOffset + 1);
          const b = view.getUint8(pointOffset + i * bpp + attributeOffset + 2);
          const a = view.getUint8(pointOffset + i * bpp + attributeOffset + 3);
          array[4 * i + 0] = r;
          array[4 * i + 1] = g;
          array[4 * i + 2] = b;
          array[4 * i + 3] = a;
        }

        attributeOffset += 4;
        // @ts-expect-error: D3 typing issue
        buffers[attribute] = array;
      } else if (attribute === 'INTENSITY') {
        const array = new Uint16Array(numPoints);

        for (let i = 0; i < numPoints; i++) {
          const intensity = view.getUint16(pointOffset + i * bpp + attributeOffset, true);
          array[i] = intensity;
        }

        attributeOffset += 2;
        // @ts-expect-error: D3 typing issue
        buffers[attribute] = array;
      } else if (attribute === 'CLASSIFICATION') {
        const array = new Uint8Array(numPoints);

        for (let i = 0; i < numPoints; i++) {
          const classification = view.getUint8(pointOffset + i * bpp + attributeOffset);
          array[i] = classification;
        }

        attributeOffset += 1;
        // @ts-expect-error: D3 typing issue
        buffers[attribute] = array;
      } else if (attribute === 'POSITION_PROJECTED_PROFILE') {
        // Note: if necessary, use Float64Array(2 * numPoints) to increase storage
        const array = new Float32Array(2 * numPoints);

        const scale = metadata.scale;

        for (let i = 0; i < numPoints; i++) {
          const MILEAGE = view.getInt32(pointOffset + i * bpp + attributeOffset + 0, true);
          const ELEVATION = view.getInt32(pointOffset + i * bpp + attributeOffset + 4, true);

          const mileage = MILEAGE * scale;
          const elevation = ELEVATION * scale;

          array[2 * i + 0] = mileage;
          array[2 * i + 1] = elevation;
        }

        attributeOffset += 8;
        // @ts-expect-error: D3 typing issue
        buffers[attribute] = array;
      } else {
        console.warn(`unkown attribute: ${attribute}`);
      }
    }

    // const duration = performance.now() - tStart;
    // console.log(`readPotreeAttributes: ${parseInt(duration)}ms`);

    return buffers;
  }

  async getData(
    pointCloudName: string,
    minLOD: number,
    maxLOD: number,
    profileWidth: number,
    coordinates: string,
    abortSignal: AbortSignal
  ) {
    const queryURL = new URL('./profile/get', this.baseURL);
    queryURL.searchParams.append('minLOD', minLOD.toString());
    queryURL.searchParams.append('maxLOD', maxLOD.toString());
    queryURL.searchParams.append('width', profileWidth.toString());
    queryURL.searchParams.append('coordinates', coordinates);
    queryURL.searchParams.append('pointCloud', pointCloudName);
    queryURL.searchParams.append('attributes', ''); // {INTENSITY}

    try {
      const response = await fetch(queryURL, { signal: abortSignal });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const view = new DataView(buffer);
      const metadataSize = view.getInt32(0, true);
      const bufferMetadata = buffer.slice(4, 4 + metadataSize);
      const dec = new TextDecoder('utf-8');
      // When there are no points, the Potree metadata's bounding box is set to -inf, inf. This is invalid JSON, so it's replaced with nulls.
      const txtMetadata = dec.decode(bufferMetadata).replace(/(-?inf)/g, 'null');
      const jsonMetadata = JSON.parse(txtMetadata);
      const attributes = jsonMetadata.pointAttributes;
      const numPoints = jsonMetadata.points;
      const buffers = this.readPotreeAttributes(jsonMetadata, metadataSize, numPoints, buffer, attributes);

      return { data: buffers, metadata: jsonMetadata };
    } catch (_error) {
      // @ts-expect-error: typing issue
      if (_error.name === 'AbortError') {
        console.warn('Fetch aborted');
      } else {
        console.error('Fetch failed:', _error);
      }
    }
  }

  getClassificationColor(classification: Uint8Array, colorScheme: { [key: string]: ClassificationColor }): Uint8Array {
    const rgb = new Uint8Array(classification.length * 3);
    classification.forEach((key, index) => {
      const color = colorScheme[key]?.color.split(',').map(Number) || [0, 0, 0];
      rgb.set(color, index * 3);
    });
    return rgb;
  }
}
