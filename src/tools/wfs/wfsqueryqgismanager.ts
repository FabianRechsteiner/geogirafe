import AbstractWfsQueryManager from './abstractwfsquerymanager';

class WfsQGISManager extends AbstractWfsQueryManager {
  constructor(wfsUrl: string, featurePrefix: string = 'feature', featureNS: string = 'http://www.qgis.org/gml') {
    super(wfsUrl, featurePrefix, featureNS);
  }
}

export default WfsQGISManager;
