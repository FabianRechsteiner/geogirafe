export interface SelectFeaturesActionDetails {
    action: 'selectFeatures';
    selectionParams: any;
}

export interface SelectionParams {
    wfsUrl: string;
    selectionBox: number[];
    srid: string;
    featureTypes: string[];
}

enum GeoEvents {
    CustomEventType = 'GeoGirafe.App',
    selectFeatures = 'selectFeatures',
    undoDraw = 'undoDraw',
    zoomToExtent = 'zoomToExtent',
}

export default GeoEvents;
