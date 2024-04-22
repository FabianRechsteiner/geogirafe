import tippy from 'tippy.js';
import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import MapPosition from '../../../tools/state/mapposition';
import NavBookmarksComponent from '../navbookmarks/component';
import { Bookmark } from '../Bookmark';
import IconAdd from './images/add.svg';
import IconBookmark from './images/bookmark.svg';
import IconNext from './images/next.svg';
import IconPrevious from './images/previous.svg';
import IconTrash from './images/trash.svg';

type TippyType = typeof tippy;

class NavHelperComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';
  iconAdd: string = IconAdd;
  iconBookmark: string = IconBookmark;
  iconNext: string = IconNext;
  iconPrevious: string = IconPrevious;
  iconTrash: string = IconTrash;

  #tooltip: TippyType;
  #positionHistory: MapPosition[] = [];
  #currentPositionIndex: number = -1;

  bookmarks: Bookmark[] = [];

  bookmarkStorage: string = 'localStorage';

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
      content: (_reference: object) => {
        const bookmarkbox = new NavBookmarksComponent(this);
        return bookmarkbox;
      }
    });
  }

  addBookmark(bookmark: Bookmark) {
    this.bookmarks.push(bookmark);
    this.saveBookmarks();
    super.render();
    super.girafeTranslate();
    this.#tooltip.hide();
  }

  removeBookmark(bookmark: Bookmark) {
    const index = this.bookmarks.indexOf(bookmark);
    if (index >= 0) {
      this.bookmarks.splice(index, 1);
    }
    this.saveBookmarks();
    super.render();
    super.girafeTranslate();
  }

  async saveBookmarks() {
    if (this.bookmarkStorage === 'localStorage') {
      localStorage.setItem('bookmarks', JSON.stringify(this.bookmarks));
    } else if (this.bookmarkStorage === 'server') {
      // TODO: Define a workflow and finalize it
      const url = this.configManager.Config.bookmarks!.post;
      const response = await fetch(url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.bookmarks)
      });
      const data = await response.json();
      console.log(data);
    }
  }

  async loadBookmarks() {
    this.bookmarks = [];
    let storedBookmarks: string | null = '';

    if (this.bookmarkStorage === 'localStorage') {
      storedBookmarks = localStorage.getItem('bookmarks');
    } else if (this.bookmarkStorage === 'server') {
      // TODO: Define a workflow and finalize it
      const url = this.configManager.Config.bookmarks!.get;
      const response = await fetch(url!);
      const data = await response.json();
      storedBookmarks = data;
    }

    if (storedBookmarks) {
      const jsonBookmarks = JSON.parse(storedBookmarks);

      for (const bookmark of jsonBookmarks) {
        const position = new MapPosition();
        position.center = bookmark.position.center;
        position.zoom = bookmark.position.zoom;
        position.resolution = bookmark.position.resolution;
        position.scale = bookmark.position.scale;
        this.bookmarks.push(new Bookmark(bookmark.name, position));
      }
    }
  }

  registerEvents() {
    this.stateManager.subscribe('position', (_oldPosition: MapPosition, newPosition: MapPosition) =>
      this.onPositionChanged(newPosition)
    );
  }

  onPositionChanged(position: MapPosition) {
    if (!this.#selfNavigation) {
      // When the application is initializing, the position is perhaps not correct
      if (!position.isValid) {
        return;
      }

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
      this.bookmarkStorage = this.configManager.Config.bookmarks
        ? this.configManager.Config.bookmarks.service
        : 'localStorage';
      this.loadBookmarks();
      this.render();
      super.girafeTranslate();
      this.registerEvents();
    });
  }
}

export default NavHelperComponent;
