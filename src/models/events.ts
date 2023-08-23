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
    responseLegendUrl = 'responseLegendUrl',
    selectFeatures = 'selectFeatures',
    undoDraw = 'undoDraw',
    zoomToExtent = 'zoomToExtent',
    requestLegendUrl = 'requestLegendUrl',
}

export default GeoEvents;
