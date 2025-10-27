import Geolocation, { type GeolocationError } from 'ol/Geolocation.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import { RegularShape } from 'ol/style';

import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import locationDisabledIcon from '../../assets/icons/location_disabled.svg';
import locationSearchingIcon from '../../assets/icons/location_searching.svg';
import locationHeadingIcon from '../../assets/icons/location_heading.svg';
import myLocationIcon from '../../assets/icons/my_location.svg';
import type { Coordinate } from 'ol/coordinate';

type GeolocationStatus = 'off' | 'error' | 'searching' | 'tracking' | 'headlock';

export default class GeolocationMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];
  geolocation: Geolocation | null = null;
  status: GeolocationStatus = 'off';
  statusBeforeError: GeolocationStatus = 'off';

  private readonly positionFeature: Feature;
  private readonly accuracyFeature: Feature;
  private readonly headingFeature: Feature;
  private readonly vectorLayer: VectorLayer;
  private shouldCenter = false;
  private isTrackingOutsideView = false;
  private lastPositionTimestamp = 0;
  private isPressed = false;
  private hasLongpressed = false;

  constructor() {
    super('geolocation-mobile');
    this.positionFeature = new Feature();
    this.positionFeature.setProperties({ order: 1 });
    this.positionFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({
            color: 'rgb(38, 197, 255)'
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2
          })
        })
      })
    );

    this.headingFeature = new Feature();
    this.headingFeature.setProperties({ order: 2 });
    this.headingFeature.setStyle(
      new Style({
        image: new RegularShape({
          points: 3, // Triangle has 3 points
          radius: 8,
          displacement: [0, 15],
          fill: new Fill({
            color: 'rgb(38, 197, 255)'
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 2
          }),
          rotation: 0
        })
      })
    );

    this.accuracyFeature = new Feature();
    this.accuracyFeature.setProperties({ order: 3 });
    this.accuracyFeature.setStyle(
      new Style({
        stroke: new Stroke({
          color: 'rgba(38, 197, 255, 0.5)',
          width: 1,
          lineDash: [5, 5]
        }),
        fill: new Fill({
          color: 'rgba(38, 197, 255, 0.1)'
        })
      })
    );

    this.vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [this.accuracyFeature, this.headingFeature, this.positionFeature]
      }),
      renderOrder: (fA, fB) => {
        const orderA = fA.getProperties().order || 0;
        const orderB = fB.getProperties().order || 0;
        return orderA - orderB;
      }
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.registerInteractionListener('map.contextmenu', false);

    const map = this.context.mapManager.getMap();

    const onMapInteract = () => {
      if (this.status === 'headlock') {
        this.disableHeadlock();
      }
    };

    // When the map is dragged, it disables the heading lock
    map.on('pointerdrag', onMapInteract);

    map.once('postrender', () => {
      const view = map.getView();
      map.addLayer(this.vectorLayer);

      this.geolocation = new Geolocation({
        trackingOptions: {
          enableHighAccuracy: true
        },
        projection: view.getProjection()
      });

      this.geolocation.on('error', (_err: GeolocationError) => {
        this.statusBeforeError = this.status;
        this.pauseTracking();
        this.status = 'error';
        this.render();

        // If an error occurs, there is a timeout of 15 seconds until going back to "off" mode,
        // unless a new location was acquired in the meantime
        const errorTimestamp = Date.now();
        setTimeout(() => {
          if (this.lastPositionTimestamp < errorTimestamp) {
            this.stopTracking();
            this.render();
          }
        }, 15 * 1000);
      });

      this.geolocation.on('change:tracking', () => {
        if (!this.geolocation) {
          return;
        }

        if (this.geolocation.getTracking()) {
          this.vectorLayer.setVisible(true);
        } else {
          this.pauseTracking();
          this.status = 'off';
        }

        this.render();
      });

      this.geolocation.on('change:position', () => {
        if (!this.geolocation) {
          return;
        }

        const coordinates = this.geolocation.getPosition();
        this.positionFeature.setGeometry(coordinates ? new Point(coordinates) : undefined);

        if (!coordinates) {
          return;
        }

        this.vectorLayer.setVisible(true);

        switch (this.status) {
          case 'off':
          case 'searching':
            this.status = 'tracking';
            this.render();
            break;

          case 'error':
            if (this.statusBeforeError === 'tracking' || this.statusBeforeError === 'headlock') {
              this.vectorLayer.changed();
              this.status = this.statusBeforeError;
              this.render();
            }
            break;

          default:
        }

        // Update the button icon if tracked position moved outside of view
        this.lastPositionTimestamp = Date.now();
        this.updateIconIfTrackingOutside();

        if (this.status === 'headlock') {
          view.setCenter(coordinates);
        }

        // Center on the geolocation  if not in the view at the moment of switching geolocation ON
        if (this.shouldCenter) {
          if (!this.isGeolocationInView()) {
            this.centerToView();
          }
          this.shouldCenter = false;
        }
      });

      this.geolocation.on('change:accuracy', () => {
        if (!this.geolocation) {
          return;
        }
      });

      this.geolocation.on('change:accuracyGeometry', () => {
        if (!this.geolocation) {
          return;
        }

        this.accuracyFeature.setGeometry(this.geolocation.getAccuracyGeometry() ?? undefined);
      });

      this.geolocation.on('change:heading', () => {
        if (!this.geolocation) {
          return;
        }

        const heading = this.geolocation.getHeading();
        if (heading === undefined) {
          this.headingFeature.setGeometry(undefined);
          return;
        }

        const coordinates = this.geolocation.getPosition();
        this.headingFeature.setGeometry(coordinates ? new Point(coordinates) : undefined);

        // When the headlock is enabled, the map rotates to align with the heading
        // but when the headlock is disabled, the arrow icon on the geolocation marker rotates
        if (this.status === 'headlock') {
          ((this.headingFeature.getStyle() as Style).getImage() as RegularShape).setRotation(0);
          map.getView().setRotation(-heading);
        } else {
          ((this.headingFeature.getStyle() as Style).getImage() as RegularShape).setRotation(
            heading + map.getView().getRotation()
          );
        }
      });

      view.on('change', () => {
        this.updateIconIfTrackingOutside();
      });

      this.render();
    });
  }

  private pauseTracking() {
    this.isTrackingOutsideView = false;
    this.accuracyFeature.setGeometry(undefined);
    this.headingFeature.setGeometry(undefined);
    this.positionFeature.setGeometry(undefined);
    this.vectorLayer.setVisible(false);
  }

  private updateIconIfTrackingOutside() {
    const previous = this.isTrackingOutsideView;
    this.isTrackingOutsideView = this.isTracking() && !this.isGeolocationInView();

    if (this.isTrackingOutsideView !== previous) {
      this.render();
    }
  }

  getIconForStatus() {
    // The geolocation object must be instantiated,
    // which happens only after the OL Map is ready
    if (!this.geolocation) {
      return;
    }

    switch (this.status) {
      case 'searching':
        return locationSearchingIcon;
      case 'tracking':
        return myLocationIcon;
      case 'off':
        return locationDisabledIcon;
      case 'error':
        return locationDisabledIcon;
      case 'headlock':
        return locationHeadingIcon;
      default:
        return locationDisabledIcon;
    }
  }

  pointerUp(e: PointerEvent) {
    e.stopPropagation();
    this.isPressed = false;

    if (this.hasLongpressed) {
      this.hasLongpressed = false;
      const clockDiv = this.shadow.getElementById('clock') as HTMLDivElement;
      clockDiv.style.setProperty('display', 'none');
      this.stopTracking();
      return;
    }

    if (e.type === 'pointerleave') {
      return;
    }

    switch (this.status) {
      case 'searching':
        return this.stopTracking();

      case 'tracking':
        if (this.isTracking()) {
          // if the geolocation is already tracking,
          // it checks if the location is in the view. If not, it centers it,
          // if yes, it also centers it but n addition enables the head lock
          if (this.isGeolocationInView()) {
            this.enableHeadLock();
          }
          this.centerToView();
        }
        break;

      case 'headlock':
        return this.disableHeadlock();

      case 'off':
        this.shouldCenter = true;
        return this.startTracking();

      case 'error':
        return this.stopTracking();
      default:
        return;
    }
  }

  pointerDown(e: PointerEvent) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();

    if (!(this.status === 'headlock' || this.status === 'tracking')) {
      return;
    }

    this.isPressed = true;
    let timeStampStartAnimation = 0;
    const animationDuration = 1000; // milliseconds

    const clockDiv = this.shadow.getElementById('clock') as HTMLDivElement;

    const radialGradient = (ratio: number) => {
      const angleDeg = 360 * ratio;
      if (ratio < 0.01) {
        clockDiv.style.setProperty('display', 'none');
        return;
      }

      clockDiv.style.setProperty('display', 'inherit');
      clockDiv.style.setProperty(
        'background',
        `conic-gradient(red 0deg, red ${angleDeg}deg, transparent ${angleDeg}deg, transparent 360deg)`
      );
    };

    const animate = () => {
      const now = performance.now();
      const progressMillisec = now - timeStampStartAnimation;
      const progressRatio = progressMillisec / animationDuration;

      if (!this.isPressed) {
        clockDiv.style.setProperty('display', 'none');
        return;
      }

      if (progressRatio >= 0.99) {
        this.hasLongpressed = true;
      }

      radialGradient(progressRatio);
      requestAnimationFrame(animate);
    };

    setTimeout(() => {
      if (this.isPressed) {
        timeStampStartAnimation = performance.now();
        animate();
      }
    }, 200);
  }

  preventContextMenu(e: PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    return false;
  }

  getCssClassesForStatus() {
    switch (this.status) {
      case 'searching':
        return 'blink';
      case 'tracking':
        return this.isTrackingOutsideView ? 'black-to-blue blink' : 'black-to-blue';
      case 'off':
        return 'alpha';
      case 'headlock':
        return 'black-to-blue';
      case 'error':
        return 'black-to-red blink';
      default:
        return 'alpha';
    }
  }

  private stopTracking() {
    if (!this.geolocation) {
      return;
    }

    this.geolocation.setTracking(false);
    this.status = 'off';
    this.render();
  }

  private startTracking() {
    if (!this.geolocation) {
      return;
    }

    // Already tracking
    if (this.geolocation.getTracking()) {
      return;
    }

    // When the geolocalization is activated, a toast message is displayed to
    // inform how to disable it
    const infoMessageId = crypto.randomUUID();
    this.context.stateManager.state.infobox.elements.push({
      id: infoMessageId,
      text: this.context.i18nManager.getTranslation('Longpress disable geolocation'),
      type: 'info'
    });

    // The message is shown for a few seconds and then is removed without the need
    // for the user to close it
    setTimeout(() => {
      for (let i = 0; i < this.context.stateManager.state.infobox.elements.length; i += 1) {
        const infoMessage = this.context.stateManager.state.infobox.elements[i];
        if (infoMessage.id === infoMessageId) {
          this.context.stateManager.state.infobox.elements.splice(i, 1);
          break;
        }
      }
    }, 3 * 1000);

    // Until the tracking is treiggered (caught by event above), the status is set to "searching"
    this.status = 'searching';
    this.render();

    this.geolocation.setTracking(true);
  }

  private isTracking(): boolean {
    if (!this.geolocation) {
      return false;
    }

    return !!this.geolocation.getTracking();
  }

  private centerToView(duration = 300) {
    const tracking = this.isTracking();
    if (!tracking) {
      return;
    }

    const coordinates = this.geolocation?.getPosition();
    if (!coordinates) {
      return;
    }

    this.context.mapManager.getMap().getView().animate({
      center: coordinates,
      duration
    });
  }

  private isGeolocationInView(): boolean {
    const tracking = this.isTracking();
    if (!tracking) {
      return false;
    }

    const coordinates = this.geolocation?.getPosition();
    if (!coordinates) {
      return false;
    }

    const map = this.context.mapManager.getMap();

    // Get the pixel for the geolocation coordinates
    const pixel = map.getPixelFromCoordinate(coordinates);

    // Check if the pixel is within the map's viewport size.
    // This is a bit costlier than checking if the geolocaiton coordinates
    // are within the extent of the view, but this is more robust as the view extent
    // is much wider than the visible part of the map when the heading of the map is not pointng north
    const mapSize = map.getSize();
    if (!pixel || !mapSize) {
      return false;
    }

    return pixel[0] >= 0 && pixel[0] <= mapSize[0] && pixel[1] >= 0 && pixel[1] <= mapSize[1];
  }

  enableHeadLock() {
    if (this.isTracking() && this.status === 'tracking' && this.geolocation?.getHeading() !== undefined) {
      const start = performance.now();
      const animationDuration = 300;
      const arrowRotationStart = ((this.headingFeature.getStyle() as Style).getImage() as RegularShape).getRotation();
      const arrowRotationTarget = 0;
      const mapRotationStart = this.context.mapManager.getMap().getView().getRotation();
      const mapRotationTarget = -(this.geolocation?.getHeading() as number);
      const mapCenterStart = this.context.mapManager.getMap().getView().getCenter() as Coordinate;
      const mapCenterTarget = this.geolocation.getPosition() as Coordinate;

      // Finding the shortest rotation between CW and CCW
      const mapRotationTargetShortest =
        Math.abs(mapRotationTarget - mapRotationStart) > Math.abs(mapRotationTarget + Math.PI * 2 - mapRotationStart)
          ? mapRotationTarget + Math.PI * 2
          : mapRotationTarget;
      const arrowRotationTargetShortest =
        Math.abs(arrowRotationTarget - arrowRotationStart) >
        Math.abs(arrowRotationTarget + Math.PI * 2 - arrowRotationStart)
          ? arrowRotationTarget + Math.PI * 2
          : arrowRotationTarget;

      // To animate the different components, we cannot use this.context.mapManager.getMap().getView().animate() because
      // it appears that it's locking non-map view update (such as the arrow icon) during the animation.
      // Due to this limitation, the animation is done with a lower level

      const updateHeadingArrow = () => {
        // Progress and easing
        const now = performance.now();
        const progress = (now - start) / animationDuration;
        const easedOutProgress = progress;

        // Animating the rotation of the heading arrow to make it point up (viewport space)
        ((this.headingFeature.getStyle() as Style).getImage() as RegularShape).setRotation(
          arrowRotationTargetShortest * easedOutProgress + arrowRotationStart * (1 - easedOutProgress)
        );

        // Animating the map view to rotate it to alight with geolocation heading
        this.context.mapManager
          .getMap()
          .getView()
          .setRotation(mapRotationTargetShortest * easedOutProgress + mapRotationStart * (1 - easedOutProgress));

        // animating the center offset
        const intermediateCoord = [
          mapCenterTarget[0] * easedOutProgress + mapCenterStart[0] * (1 - easedOutProgress),
          mapCenterTarget[1] * easedOutProgress + mapCenterStart[1] * (1 - easedOutProgress)
        ] as Coordinate;

        this.context.mapManager.getMap().getView().setCenter(intermediateCoord);

        if (progress < 1) {
          requestAnimationFrame(updateHeadingArrow);
        }
      };

      updateHeadingArrow();

      setTimeout(() => {
        this.status = 'headlock';
        this.render();
      }, animationDuration);
    }
  }

  disableHeadlock() {
    if (this.isTracking()) {
      this.status = 'tracking';
    } else {
      this.status = 'off';
    }

    this.render();
  }
}
