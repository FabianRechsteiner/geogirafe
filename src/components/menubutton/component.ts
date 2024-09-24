import GirafeHTMLElement from '../../base/GirafeHTMLElement';

type OpenDirection = 'bottom' | 'bottom-left' | 'up' | 'left';

class MenuButtonComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['./style.css', '../../styles/common.css'];

  open = false;
  openDirection: OpenDirection = 'bottom';

  constructor() {
    super('menubutton');
  }

  render() {
    this.openDirection = this.hasAttribute('open') ? (this.getAttribute('open') as OpenDirection) : 'bottom';
    super.render();
  }

  listenChildButtons() {
    const slot = this.shadow.querySelector('slot[name="menu-content"]') as HTMLSlotElement;
    const assignedNodes = slot.assignedNodes();
    const buttons = this.findAllAssignedButtons(assignedNodes);
    for (const button of buttons) {
      button.removeEventListener('click', this.closeMenuHandler);
      button.addEventListener('click', this.closeMenuHandler);
    }
  }

  getClass() {
    if (!this.open) {
      return 'hidden';
    }
    return 'menu-content open-' + this.openDirection;
  }

  public toggleMenu() {
    if (this.open) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  private openMenu() {
    this.listenChildButtons();
    this.open = true;
    super.render();
  }

  private closeMenuHandler = () => this.closeMenu(true);
  private closeMenu(closeParent: boolean = false) {
    this.open = false;
    if (closeParent) {
      // If this menu itself is contained in another menu
      // We close the parent menu too
      const parentMenuButton = super.getParentOfType(
        'GIRAFE-MENU-BUTTON',
        this.shadow.host.parentNode
      ) as MenuButtonComponent;
      if (parentMenuButton !== null) {
        parentMenuButton.toggleMenu();
      }
    }
    super.render();
  }

  findAllAssignedButtons(nodes: Node[]): HTMLButtonElement[] {
    const buttons: HTMLButtonElement[] = [];

    for (const node of nodes) {
      if (node.nodeName === 'BUTTON') {
        buttons.push(node as HTMLButtonElement);
      }

      if (node.hasChildNodes()) {
        buttons.push(...this.findAllAssignedButtons(Array.from(node.childNodes)));
      }
    }

    return buttons;
  }

  connectedCallback() {
    super.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
    });
  }
}

export default MenuButtonComponent;
