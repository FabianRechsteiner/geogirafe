import * as d3 from 'd3';

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
