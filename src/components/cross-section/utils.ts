import ConfigManager from '../../tools/configuration/configmanager';
import * as d3 from 'd3';

// Types
type potreePointAttribute =
  | 'POSITION_CARTESIAN'
  | 'RGB'
  | 'INTENSITY'
  | 'CLASSIFICATION'
  | 'POSITION_PROJECTED_PROFILE';

type potreeMetadata = {
  boundingBox: { lx: number; ly: number; lz: number; ux: number; uy: number; uz: number };
  bytesPerPoint: number;
  durationMS: number;
  nodesProcessed: number;
  pointAttributes: potreePointAttribute[];
  points: number;
  pointsProcessed: number;
  scale: number;
};

/* Parse Potree format
The parsing code readPotreeAttributeData() is adapted from the CPotree repository (https://github.com/potree/CPotree/blob/master/docs/example_display/display_v1.html)
*/
export function readPotreeAttributeData(
  metadata: potreeMetadata,
  metadataSize: number,
  numPoints: number,
  fullBuffer: ArrayBuffer,
  attributes: potreePointAttribute[]
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
  // console.log(`readPotreeAttributeData: ${parseInt(duration)}ms`);

  return buffers;
}

/* Retrieve data via REST API */
export async function getProfileData(
  minLOD: number,
  maxLOD: number,
  profileWidth: number,
  coordinates: string,
  abortSignal: AbortSignal
) {
  const baseURL = ConfigManager.getInstance().Config.lidar.url.replace(/\/?$/, '/');
  const queryURL = new URL('./profile/get', baseURL);
  queryURL.searchParams.append('minLOD', minLOD.toString());
  queryURL.searchParams.append('maxLOD', maxLOD.toString());
  queryURL.searchParams.append('width', profileWidth.toString());
  queryURL.searchParams.append('coordinates', coordinates);
  queryURL.searchParams.append('pointCloud', 'sitn2022');
  queryURL.searchParams.append('attributes', '{INTENSITY}');

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
    const txtMetadata = dec.decode(bufferMetadata);
    const jsonMetadata = JSON.parse(txtMetadata);
    const attributes = jsonMetadata.pointAttributes;
    const numPoints = jsonMetadata.points;

    // read potree attribute data
    const buffers = readPotreeAttributeData(jsonMetadata, metadataSize, numPoints, buffer, attributes);

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

// Compute point colors
export function computeColors(
  values: Uint8Array | Uint16Array,
  colormap: string = 'spectral',
  domain: number[] = []
): Uint8Array {
  const N = values.length;

  // Set color palette
  let colorPalette;

  switch (colormap) {
    case 'spectral':
      colorPalette = d3.scaleSequential(d3.interpolateSpectral).domain(domain);
      break;

    case 'viridis':
      colorPalette = d3.scaleSequential(d3.interpolateViridis).domain(domain);
      break;

    case 'greys':
      colorPalette = d3.scaleSequential(d3.interpolateGreys).domain(domain);
      break;

    case 'magma':
      colorPalette = d3.scaleSequential(d3.interpolateMagma).domain(domain);
      break;

    case 'blues':
      colorPalette = d3.scaleSequential(d3.interpolateBlues).domain(domain);
      break;

    case 'custom':
      colorPalette = d3
        .scaleOrdinal()
        // @ts-expect-error: D3 typing issue
        .domain([1, 2, 3, 4, 5, 6, 7, 9, 11, 14, 15, 17, 18, 19, 21, 22, 25, 26, 29, 31, 41])
        .range([
          '#C0C0C0',
          '#DEB887',
          '#9ACD32',
          '#32CD32',
          '#008000',
          '#B22222',
          '#FFFF00',
          '#87CEFA',
          '#B8860B',
          '#BA55D3',
          '#FF1493',
          '#EEE8AA',
          '#FFD700',
          '#7FFFD4',
          '#DDA0DD',
          '#A0522D',
          '#FFA500',
          '#FA8072',
          '#FF6347',
          '#BC8F8F',
          '#6495ED'
        ]);

      break;

    case 'uniform':
      // @ts-expect-error: D3 typing issue
      colorPalette = d3.scaleOrdinal().domain([1]).range(['#DEB887']);
      break;

    default:
      // @ts-expect-error: D3 typing issue
      colorPalette = d3.scaleOrdinal().domain([1]).range([colormap]);
  }

  const rgb = new Uint8Array(N * 3);

  values.forEach((d, index) => {
    // @ts-expect-error: D3 typing issue
    const color = d3.color(colorPalette(d)) as d3.RGBColor;
    rgb[index * 3 + 0] = color.r;
    rgb[index * 3 + 1] = color.g;
    rgb[index * 3 + 2] = color.b;
  });

  return rgb;
}
