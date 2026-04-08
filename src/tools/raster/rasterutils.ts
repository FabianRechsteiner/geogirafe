// SPDX-License-Identifier: Apache-2.0
import { fromUrl, GeoTIFFImage, TypedArray } from 'geotiff';

export interface GeoTransform {
  tiePoint: { x: number; y: number };
  pixelScale: number[];
}

export async function extractGeoTransform(image: GeoTIFFImage): Promise<GeoTransform> {
  const tiePoint = (await image.getTiePoints())[0];
  const pixelScale = image.getFileDirectory().getValue('ModelPixelScale') as number[];
  return { tiePoint, pixelScale };
}

export function mapToPixel(transform: GeoTransform, mapX: number, mapY: number): [number, number] {
  const pixelX = Math.round((mapX - transform.tiePoint.x) / transform.pixelScale[0]);
  const pixelY = Math.round((transform.tiePoint.y - mapY) / transform.pixelScale[1]);
  return [pixelX, pixelY];
}

export function pixelToMap(transform: GeoTransform, pixelX: number, pixelY: number): [number, number] {
  const mapX = transform.tiePoint.x + pixelX * transform.pixelScale[0];
  const mapY = transform.tiePoint.y - pixelY * transform.pixelScale[1];
  return [mapX, mapY];
}

export async function getImage(url: string) {
  const tiff = await fromUrl(url);
  const image = await tiff.getImage();
  return image;
}

export async function getPixelValue(image: GeoTIFFImage, transform: GeoTransform, coordinates: number[]) {
  const [pixelX, pixelY] = mapToPixel(transform, coordinates[0], coordinates[1]);
  const window = [pixelX, pixelY, pixelX + 1, pixelY + 1];
  const width = image.getWidth();
  const height = image.getHeight();
  let pixelValue: number | null;

  if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
    const pixelData = (await image.readRasters({ samples: [0], window: window })) as TypedArray[];
    pixelValue = pixelData[0][0];
  } else {
    pixelValue = null;
  }
  return pixelValue;
}
