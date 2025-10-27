import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import type { SwipeupPanelMode } from '../../tools/state/state';

// Css "top" values corresponding to the above modes:
const TOP_FULL = 'calc( env(safe-area-inset-top) + 1rem)';
const TOP_REDUCED = 'calc(100dvh - env(safe-area-inset-bottom) - 4rem)';
const TOP_HALF = '50dvh';
const TOP_CLOSED = '101dvh';

// Velocity of the top sliding gesture applied to the top handle, in pixels per milliseconds,
// to trigger a closing (if swiping down) or full opening (if swiping up) of the whole panel
const SLIDE_VELOCITY_THRESHOLD = 1.5;

export default class SwipeUpPanelMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  private container!: HTMLDivElement;
  private middleContainer!: HTMLDivElement;
  private pointerYOrigin = 0;
  private containerTopStart = 0;
  private isPointerDown = false;
  private pointerVelocity = 0;
  private previousPointerY = 0;
  private previousMoveTimestamp = 0;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    super('swipe-up-panel-mobile');
  }

  connectedCallback(): void {
    super.connectedCallback();

    // Render the panel for the first time, as hidden so that we can make references to the DOM elements
    this.render();

    this.container = this.shadow.getElementById('swipe-up-panel') as HTMLDivElement;
    this.middleContainer = this.shadow.querySelector('.middle-container') as HTMLDivElement;

    // Toggle to dark mode when needed
    this.subscribe('interface.darkFrontendMode', (_oldValue: boolean, newValue: boolean) => {
      const isDarkMode = newValue;
      this.container.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
      this.container.classList.remove(isDarkMode ? 'light-mode' : 'dark-mode');
    });

    // Set up resize observer to handle keyboard open/close and other viewport changes
    this.setupResizeObserver();

    // Placing it below
    this.container.style.top = TOP_CLOSED;

    // Removing the hidden CSS class that was hiding the panel
    this.container.classList.remove('hidden');

    // Allow the panel to be adjusted from the global state. Also called at init time
    this.subscribe('interface.swipeupPanelMode', (_oldValue: SwipeupPanelMode, newValue: SwipeupPanelMode) => {
      if (newValue === 'manual') {
        return;
      }
      this.animateToMode(newValue);
    });
  }

  /**
   * Adds the capability to adjust the swipeup panel size when the mobile virtual keyboard shows up
   */
  private setupResizeObserver() {
    // Use visualViewport if available (better for keyboard detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        this.adjustMiddleContainerToContent();
      });
    }

    // Fallback to ResizeObserver on document.body
    this.resizeObserver = new ResizeObserver(() => {
      this.adjustMiddleContainerToContent();
    });

    this.resizeObserver.observe(document.body);
  }

  /**
   * Update the state of the panel in an animated way
   * @param mode
   */
  private animateToMode(mode: SwipeupPanelMode) {
    // The class to animate a transition is added only when the position is adjusted
    // non-manualy, otherwise it creates some non-linear delay when grabbing the handle
    this.container.classList.add('easeTransition');

    switch (mode) {
      case 'full':
        this.container.style.top = TOP_FULL;
        break;
      case 'reduced':
        this.container.style.top = TOP_REDUCED;
        break;
      case 'half':
        this.container.style.top = TOP_HALF;
        break;
      default:
        this.container.style.top = TOP_CLOSED;
        break;
    }

    let shoudlUpdate = true;

    // Animate the resizing of the container height to avoid
    // a single (brutal) update at the end of the resizing
    const refreshContainerheight = () => {
      this.adjustMiddleContainerToContent();
      if (shoudlUpdate) {
        requestAnimationFrame(refreshContainerheight);
      }
    };

    refreshContainerheight();

    // Keeping the easing only when folding, removing it after 350ms
    // because the CSS transition takes 300ms
    setTimeout(() => {
      shoudlUpdate = false;
      this.container.classList.remove('easeTransition');
    }, 350);
  }

  private adjustMiddleContainerToContent() {
    if (!this.middleContainer || !this.container) {
      return;
    }

    this.middleContainer.style.height = `calc(100dvh - max(${TOP_FULL}, ${Number.parseInt(window.getComputedStyle(this.container).top)}px) - 35px)`;
  }

  swipeHandleOnPointerDown(e: PointerEvent) {
    e.preventDefault();
    this.isPointerDown = true;
    this.pointerYOrigin = e.clientY;
    this.containerTopStart = Number.parseInt(window.getComputedStyle(this.container).top) || 0;
  }

  swipeHandleOnPointerUp() {
    this.isPointerDown = false;

    // If the panel was dragged upwards or downwards "fast enough", then it goes
    // all the way up or down (closed).
    if (this.pointerVelocity > SLIDE_VELOCITY_THRESHOLD) {
      this.state.interface.swipeupPanelMode = 'closed';
    } else if (this.pointerVelocity < -SLIDE_VELOCITY_THRESHOLD) {
      this.state.interface.swipeupPanelMode = 'full';
    }
  }

  swipeHandleOnPointerMove(e: PointerEvent) {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    this.state.interface.swipeupPanelMode = 'manual';

    if (!this.isPointerDown) {
      return;
    }
    const deltaY = this.pointerYOrigin - e.clientY;
    const newTopValue = this.containerTopStart - deltaY;

    // Adjust the height of the entire panel based on the pointer movement (y-axis only)
    this.container.style.top = `min( ${TOP_REDUCED}, max(${TOP_FULL}, ${newTopValue}px)  )`;
    this.middleContainer.style.height = `max(calc(100dvh - max(${TOP_FULL}, ${newTopValue}px) - 35px), 2rem)`;

    this.pointerVelocity = (e.clientY - this.previousPointerY) / (Date.now() - this.previousMoveTimestamp);
    this.previousPointerY = e.clientY;
    this.previousMoveTimestamp = Date.now();
  }

  closeButtonOnPointerDown() {
    this.state.interface.swipeupPanelMode = 'closed';
  }
}
