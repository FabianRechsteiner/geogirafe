import tippy from "tippy.js";
import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import MapPosition from '../../../tools/state/mapposition';
import NavBookmarksComponent from "../navbookmarks/component";
import { Bookmark } from "../Bookmark";

class NavHelperComponent extends GirafeHTMLElement {

  templateUrl = './template.html';
  styleUrl = './style.css';

  #tooltip: any;
  #positionHistory: MapPosition[] = [];
  #currentPositionIndex: number = -1;

  bookmarks: Bookmark[] = [];

  get hasBookmark() {
    return this.bookmarks.length > 0;
  }

  #selfNavigation: boolean = false;

  constructor() {
    super('navhelper');
  }

  render() {
    super.render();
    this.createBookmarkTooltip();
  }

  createBookmarkTooltip() {
    const el = this.shadow.getElementById('add-bookmark');
    this.#tooltip = tippy(el, {
      trigger: 'click',
      arrow: true,
      interactive: true,
      theme: 'light',
      placement: 'bottom',
      appendTo: document.body,
      content: (_reference: any) => {
        const bookmarkbox = new NavBookmarksComponent(this);
        return bookmarkbox;
      }
    });
  }

  addBookmark(bookmark: Bookmark) {
    this.bookmarks.push(bookmark);
    super.render();
    super.girafeTranslate();
    this.#tooltip.hide();
  }

  removeBookmark(bookmark: Bookmark) {
    const index = this.bookmarks.indexOf(bookmark);
    if (index >= 0) {
      this.bookmarks.splice(index, 1);
    }
    super.render();
    super.girafeTranslate();
  }

  registerEvents() {
    this.stateManager.subscribe('position', (_oldPosition: MapPosition, newPosition: MapPosition) => this.onPositionChanged(newPosition));
  }

  onPositionChanged(position: MapPosition) {
    if (!this.#selfNavigation) {
      // When the application is initializing, the position is perhaps not correct
      if (!position.isValid) {
        return;
      }

      console.log(position);
      if (this.#currentPositionIndex !== this.#positionHistory.length - 1) {
        // Remove history from this index to create a new one
        this.#positionHistory.splice(this.#currentPositionIndex + 1);
      }
      this.#positionHistory.push(position);
      this.#currentPositionIndex = this.#positionHistory.length - 1;
    }
  }

  navigateBack() {
    let position = this.#positionHistory[this.#currentPositionIndex];
    if (this.#currentPositionIndex > 0) {
      this.#currentPositionIndex--;
      position = this.#positionHistory[this.#currentPositionIndex];
      console.log('Navigating back to:', position);
    }

    this.navigateToPosition(position);
  }

  navigateForward() {
    let position = this.#positionHistory[this.#currentPositionIndex];
    if (this.#currentPositionIndex < this.#positionHistory.length - 1) {
      this.#currentPositionIndex++;
      position = this.#positionHistory[this.#currentPositionIndex];
      console.log('Navigating forward to:', position);
    }
    this.navigateToPosition(position);
  }

  navigateToPosition(position: MapPosition) {
    this.#selfNavigation = true;
    try {
      this.state.position = position;
    } finally {
      this.#selfNavigation = false;
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

customElements.define('girafe-nav-history', NavHelperComponent);

export default NavHelperComponent;
