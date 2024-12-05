import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import MapPosition from '../../tools/state/mapposition';
import { Bookmark } from './Bookmark';

class NavigationComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css'];

  private readonly positionHistory: MapPosition[] = [];
  private currentPositionIndex: number = -1;

  public bookmarks: Bookmark[] = [];

  private bookmarkStorage: string = 'localStorage';

  public get hasBookmark() {
    return this.bookmarks.length > 0;
  }

  private selfNavigation: boolean = false;

  constructor() {
    super('navigation');
  }

  render() {
    super.render();
  }

  public async addBookmark() {
    const name = await window.gPrompt('Give a name to your bookmark', 'Add bookmark', 'Enter a name...');
    if (name) {
      const bookmark = new Bookmark(name, this.state.position);
      this.bookmarks.push(bookmark);
      this.saveBookmarks();
      super.render();
      super.girafeTranslate();
    }
  }

  public async removeBookmark(bookmark: Bookmark) {
    const remove = await window.gConfirm('Do you want to delete this bookmark?', 'Delete bookmark');
    if (remove) {
      const index = this.bookmarks.indexOf(bookmark);
      if (index >= 0) {
        this.bookmarks.splice(index, 1);
      }
      this.saveBookmarks();
      super.render();
      super.girafeTranslate();
    }
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
    this.subscribe('position', (_oldPosition: MapPosition, newPosition: MapPosition) =>
      this.onPositionChanged(newPosition)
    );
  }

  onPositionChanged(position: MapPosition) {
    if (!this.selfNavigation) {
      // When the application is initializing, the position is perhaps not correct
      if (!position.isValid) {
        return;
      }

      if (this.currentPositionIndex !== this.positionHistory.length - 1) {
        // Remove history from this index to create a new one
        this.positionHistory.splice(this.currentPositionIndex + 1);
      }
      this.positionHistory.push(position);
      this.currentPositionIndex = this.positionHistory.length - 1;
    }
  }

  navigateBack() {
    let position = this.positionHistory[this.currentPositionIndex];
    if (this.currentPositionIndex > 0) {
      this.currentPositionIndex--;
      position = this.positionHistory[this.currentPositionIndex];
      console.log('Navigating back to:', position);
    }

    this.navigateToPosition(position);
  }

  navigateForward() {
    let position = this.positionHistory[this.currentPositionIndex];
    if (this.currentPositionIndex < this.positionHistory.length - 1) {
      this.currentPositionIndex++;
      position = this.positionHistory[this.currentPositionIndex];
      console.log('Navigating forward to:', position);
    }
    this.navigateToPosition(position);
  }

  navigateToPosition(position: MapPosition) {
    this.selfNavigation = true;
    try {
      this.state.position = position;
    } finally {
      this.selfNavigation = false;
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

export default NavigationComponent;
