// Helpers for creating Openlayers object for tests
import TileLayer from 'ol/layer/Tile';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import { Point } from 'ol/geom';
import { Fill, Stroke, Style, Text, Circle } from 'ol/style';
import { StyleLike } from 'ol/style/Style';

export const createPointFeature = (): Feature<Point> => {
  return new Feature({
    name: 'A test point',
    geometry: new Point([0, 100])
  });
};

const fill = new Fill({ color: 'rgba(100, 100, 100, 0.5)' });
const stroke = new Stroke({
  color: '#002288',
  width: 1.25
});
export const styleFn = ((feature: Feature): Style => {
  return new Style({
    fill,
    stroke,
    text: new Text({
      text: feature.get('name'),
      font: '12px sans-serif',
      offsetY: 12
    }),
    image: new Circle({
      fill,
      stroke: stroke,
      radius: 5
    })
  });
}) as StyleLike;

export const createOlVectorLayer = (): VectorLayer<VectorSource> => {
  const features = [createPointFeature()];
  features[0].setStyle(styleFn);
  return new VectorLayer({
    properties: {
      name: 'Test Vector layer'
    },
    source: new VectorSource({
      features
    })
  });
};

export const createOlWmtsLayer = (): TileLayer<WMTS> => {
  return new TileLayer({
    source: new WMTS({
      layer: 'test',
      url: 'https://test-ol-wmts.com/',
      projection: 'EPSG:3857',
      style: 'test',
      matrixSet: '2056',
      tileGrid: new WMTSTileGrid({
        extent: [-10000, -10000, 10000, 10000],
        origin: [0, 0],
        tileSize: [64, 64],
        matrixIds: ['3857'],
        resolutions: [100, 10, 1]
      })
    })
  });
};
