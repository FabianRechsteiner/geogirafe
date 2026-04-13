import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { Feature } from 'ol';
import { Callback } from '../../tools/state/statemanager';
import { toLonLat } from 'ol/proj';
import { getCenter } from 'ol/extent';

class GetDirectionsArtifact extends GirafeHTMLElement {
  static readonly observedAttributes: string[] = ['available', 'geometry'];
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  feature?: Feature;
  directionsAvailable = false;
  showDirectionsProvidersDropdown = false;
  onGetDirectionsFeatureChangedCallback?: Callback;

  public constructor() {
    super('getdirections');
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  protected override connectedCallback() {
    super.connectedCallback();
    this.registerListeners();
    this.render();
  }

  protected override disconnectedCallback() {
    super.disconnectedCallback();
    this.unregisterListeners();
  }

  override render() {
    super.render();
    super.girafeTranslate();
  }

  registerListeners() {
    this.onGetDirectionsFeatureChangedCallback = this.subscribe(
      'selection.getDirectionsFeature',
      (_oldFeature?: Feature, newFeature?: Feature) => this.onGetDirectionsFeatureChanged(newFeature)
    );
    document.addEventListener('click', this.handleOutsideClick);
  }

  unregisterListeners() {
    if (this.onGetDirectionsFeatureChangedCallback) {
      this.unsubscribe(this.onGetDirectionsFeatureChangedCallback);
    }
    document.removeEventListener('click', this.handleOutsideClick);
  }

  toggleDirectionsProviders() {
    this.showDirectionsProvidersDropdown = !this.showDirectionsProvidersDropdown;
    this.render();
  }

  getDirectionsProviders() {
    if (!this.feature) return [];
    const extent = this.feature?.getGeometry()?.getExtent();
    if (!extent) {
      console.error('Invalid feature to get directions for.');
      return [];
    }
    const toLatLonCenter = toLonLat(getCenter(extent), this.context.mapManager.getMap().getView().getProjection());
    const toLat = toLatLonCenter[1];
    const toLon = toLatLonCenter[0];
    return [
      {
        id: 'apple-maps',
        icon: 'icons/directions-apple-maps.svg',
        label: 'Apple Maps',
        url: `https://maps.apple.com/directions?destination=${toLat},${toLon}`
      },
      {
        id: 'google-maps',
        icon: 'icons/directions-google-maps.svg',
        label: 'Google Maps',
        url: `https://www.google.com/maps/dir/?api=1&destination=${toLat},${toLon}`
      },
      {
        id: 'osm',
        icon: 'icons/directions-osm.svg',
        label: 'OpenStreetMap',
        url: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=%3B${toLat}%2C${toLon}`
      }
    ];
  }

  handleOutsideClick(event: PointerEvent) {
    const path = event.composedPath();

    if (!path.includes(this)) {
      this.showDirectionsProvidersDropdown = false;
      this.render();
    }
  }

  getDirectionsByUrl(url: string) {
    window.open(url, '_blank');
    this.showDirectionsProvidersDropdown = false;
    this.refreshRender();
  }

  private onGetDirectionsFeatureChanged(newFeature: Feature | undefined) {
    this.feature = newFeature;
    this.directionsAvailable = newFeature?.getGeometry()?.getType() === 'Point';
    this.render();
  }
}
export default GetDirectionsArtifact;