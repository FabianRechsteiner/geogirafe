import type { Feature } from 'ol';
import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import FeatureToGridDataById from '../../tools/featuretogriddatabyid';
import { debounce } from '../../tools/utils/debounce';
import { isValidEmail } from '../../tools/utils/utils';
import { SwipeupPanelMode } from '../../tools/state/state';

/**
 * Create a link to a page or an email if the pattern matches
 */
export function getLinkFriendlyString(inputStr: string): string {
  // Create a link if starting with http
  if (inputStr.startsWith('http')) {
    return `<a href="${inputStr}" target="_blank" rel="noreferrer">${inputStr}</a>`;
  }

  // Create an emial link if has email form
  if (isValidEmail(inputStr)) {
    return `<a href="mailto:${inputStr}">${inputStr}</a>`;
  }

  return inputStr;
}

export default class SelectionPanelMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];
  currentIndex = 0;
  private readonly debounceOnAdjustVisible = debounce(this.onAdjustVisible.bind(this), 200);

  constructor() {
    super('selectionpanel-mobile');
  }

  onAdjustVisible() {
    const hasFeaturesToDisplay = this.state.interface.selectionComponentVisible;

    if (hasFeaturesToDisplay) {
      if (this.state.interface.swipeupPanelMode === 'closed') {
        this.state.interface.swipeupPanelMode = 'half';
      }

      this.state.interface.swipeupPanelContent = 'features';
      this.state.selection.focusedFeatures = [];
      this.state.selection.focusedFeatures.push(this.state.selection.selectedFeatures[0]);
      const container = this.shadow.querySelector('.container');

      if (container) {
        container.scrollTo({
          left: 0,
          behavior: 'instant'
        });
      }
    } else {
      this.state.interface.swipeupPanelMode = 'closed';
      this.state.selection.focusedFeatures = null;
    }

    this.render();
    this.refreshRender(); // For translations
  }

  connectedCallback() {
    this.render();
    this.subscribe('interface.swipeupPanelContent', this.render.bind(this));
    this.subscribe('interface.selectionComponentVisible', this.debounceOnAdjustVisible.bind(this));

    // Empty the list of selected and focused features when closing the panel
    this.subscribe('interface.swipeupPanelMode', (_previousMode: SwipeupPanelMode, currentMode: SwipeupPanelMode) => {
      if (this.state.interface.swipeupPanelContent !== 'features') {
        return;
      }

      if (currentMode === 'closed') {
        this.state.selection.focusedFeatures = [];
        this.state.selection.selectedFeatures = [];
      }
    });

    // Listen for scroll events to update indicators
    const container = this.shadow.querySelector('.container') as HTMLDivElement;
    if (container) {
      container.addEventListener('scroll', () => {
        this.currentIndex = Math.round(container.scrollLeft / container.clientWidth);
        this.render();
      });
    }
  }

  /**
   * Moves the slide to the given index, with or without animation
   */
  private scrollToFeature(index: number, smooth = true): void {
    const container = this.shadow.querySelector('.container') as HTMLElement;
    if (!container) return;

    // Calculate the position to scroll to
    const scrollPosition = index * container.clientWidth;

    this.state.selection.focusedFeatures = [];
    this.state.selection.focusedFeatures.push(this.state.selection.selectedFeatures[index]);

    // Scroll to the position
    container.scrollTo({
      left: scrollPosition,
      behavior: smooth ? 'smooth' : 'instant'
    });
  }

  /**
   * Action triggered when touching the "previous"/"next" buttons to change slide
   */
  touchChangeSlide(delta: number) {
    const targetIndex = Math.min(
      Math.max(0, this.currentIndex + delta),
      this.state.selection.selectedFeatures.length - 1
    );
    if (targetIndex === this.currentIndex) {
      return;
    }

    const actualDelta = this.currentIndex - targetIndex;
    this.currentIndex = targetIndex;
    this.scrollToFeature(this.currentIndex, Math.abs(actualDelta) < 10);
  }

  /**
   * Return the name of the WMS query layer of a given feature
   * (using FeatureToGridDataById.getUserFeatureType directly from the template)
   */
  static getFeatureLayerName(feature: Feature): string {
    return FeatureToGridDataById.getUserFeatureType(feature);
  }
}
