import { Feature } from 'ol';
import { WFS as OlWFS } from 'ol/format';
import { ReadOptions } from 'ol/format/Feature';
import { Options } from 'ol/format/WFS';
import Geometry from 'ol/geom/Geometry';
import GML32 from 'ol/format/GML32';

/**
 * WFS parser
 *
 * Extends ol.format.WFS to be able to read nested `FeatureCollections` in GML32,
 * which are present in WFS 2.0.0 responses from MapServer, GeoServer and QGIS Server.
 * This does not change behaviour for WFS 1.1.0 and 1.0.0.
 *
 * Can be removed later when the problem linked below is resolved in ol.
 *
 * Code copied and adapted from
 * https://github.com/openlayers/openlayers/issues/12389
 */

export default class WfsParser extends OlWFS {
  public constructor(opt_options?: Options) {
    super(opt_options);
  }

  public override readFeatures(
    source: Document | Element | object | string,
    opt_options?: ReadOptions
  ): Feature<Geometry>[] {
    // @ts-expect-error gmlFormat_ is private in super class
    if (this.gmlFormat_ instanceof GML32) {
      return this.readFeaturesGML32(source, opt_options);
    }
    return super.readFeatures(source, opt_options);
  }

  public readFeaturesGML32(
    source: Document | Element | object | string,
    opt_options?: ReadOptions
  ): Feature<Geometry>[] {
    let doc: Document;
    if (source instanceof Document) {
      doc = source;
    } else if (typeof source === 'string') {
      const domParser = new DOMParser();
      doc = domParser.parseFromString(source, 'application/xml');
    } else {
      console.warn('Source for GML3.2 not supported!');
      return [];
    }

    let features: Feature<Geometry>[];
    if (this.hasNestedFeatureCollectionsGML32(doc)) {
      features = this.readNestedFeatureCollectionsGML32(doc, opt_options);
    } else {
      features = super.readFeatures(doc.documentElement, opt_options);
    }

    return features ?? [];
  }

  private readNestedFeatureCollectionsGML32(doc: Document, opt_options?: ReadOptions): Feature<Geometry>[] {
    let features: Feature<Geometry>[] = [];
    const children = doc.documentElement.children;
    for (const child of children) {
      if (this.isNestedFeatureCollection(child)) {
        const collection = child.children.item(0);
        if (collection?.children?.length) {
          features = features.concat(super.readFeatures(collection, opt_options));
        }
      }
    }
    return features;
  }

  private hasNestedFeatureCollectionsGML32(doc: Document): boolean {
    const children = doc.documentElement.children;
    for (const child of children) {
      if (this.isNestedFeatureCollection(child)) {
        return true;
      }
    }
    return false;
  }

  private isNestedFeatureCollection(element: Element | null): boolean {
    return (
      element?.localName === 'member' &&
      element.children?.length > 0 &&
      element.children.item(0)?.localName === 'FeatureCollection'
    );
  }
}
