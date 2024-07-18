import AbstractWfsQueryManager from './abstractwfsquerymanager';

class WfsMapServerManager extends AbstractWfsQueryManager {
  constructor(
    wfsUrl: string,
    featurePrefix: string = 'feature',
    featureNS: string = 'https://mapserver.gis.umn.edu/mapserver'
  ) {
    super(wfsUrl, featurePrefix, featureNS);
  }
}

export default WfsMapServerManager;
