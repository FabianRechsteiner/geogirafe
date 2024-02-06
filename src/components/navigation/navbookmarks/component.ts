import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import { Bookmark } from '../Bookmark';
import NavHelperComponent from '../navhelper/component';

class NavBookmarksComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  navHelper: NavHelperComponent;
  nameInput: HTMLInputElement | null = null;

  constructor(parent: NavHelperComponent) {
    super('navbookmarks');
    this.navHelper = parent;
  }

  render() {
    super.render();

    this.nameInput = this.shadow.getElementById('name') as HTMLInputElement;
    this.nameInput.focus();
  }

  saveBookmark() {
    if (this.nameInput) {
      try {
        const bookmark = new Bookmark(this.nameInput.value, this.state.position);
        this.navHelper.addBookmark(bookmark);
        // Reset value
        this.nameInput.value = '';
      } catch (e) {
        alert(e);
      }
    }
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
    });
  }
}

export default NavBookmarksComponent;
