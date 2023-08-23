/**
 * These are the models for a GeoMapFish backend
 */

export interface GMFOGCServer {
    url: string;
    wfsUrl?: string;
    wfsSupport?: boolean;
    imageType: "image/png" | "image/jpeg";
    isSingleTile?: boolean;
    serverType: "mapserver" | "geoserver" | "qgisserver";
}

export interface GMFTreeItem {
    id: number;
    name: string;
    ogcServer?: string;
    children?: GMFTreeItem[];
    type?: string;
    url?: string;
}

export interface GMFTheme {
    id: number;
    name: string;
    icon: string;
    // TODO: make a type for this if necessary
    functionalities: {
        [key: string]: string
    };
    // TODO: make a type for this if necessary
    metadata: {
        [key: string]: string
    };
    children: GMFTreeItem[];
}

export interface GMFGroup extends GMFTreeItem {
    children: GMFTreeItem[];
}

export interface GMFBackgroundLayer extends GMFTreeItem {
    // TODO: make a type for this if necessary
    metadata: {
        [key: string]: string
    };
    children?: Array<GMFTreeItem>;
    mixed?: boolean;
}