import GirafeHTMLElement from '../../../base/GirafeHTMLElement';
import type BaseLayer from '../../../models/layers/baselayer';
import GroupLayer from '../../../models/layers/grouplayer';
import ThemeLayer from '../../../models/layers/themelayer';
import LayerManager from '../../../tools/layers/layermanager';

export default class LayerListMobile extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrls = ['../../../styles/common.css', './style.css'];
  public layerList: BaseLayer[] = [];
  public collapsed = false;
  public numberActiveLayer = 0;

  constructor() {
    super('layer-list-mobile');
  }

  connectedCallback() {
    this.render();

    this.subscribe('layers.layersList', (_oldValue: BaseLayer[], newValue: BaseLayer[]) => {
      // Only keep actual layers (no group or theme layers)
      this.layerList = LayerManager.getInstance()
        .getFlattenedLayerTree(newValue)
        .filter((l) => {
          return !(l instanceof ThemeLayer || l instanceof GroupLayer);
        });

      this.countActiveLayers();

      this.render();

      // This is to initialize the "height" CSS prop so it actually anmates the first time
      const layerList = this.shadow.querySelector('.layer-list') as HTMLDivElement;
      layerList.style.setProperty('max-height', this.collapsed ? '0px' : `${layerList.scrollHeight}px`);
    });

    this.subscribe(/layers\.layersList\..*\.activeState/, () => {
      this.countActiveLayers();
      this.render();
    });

    this.subscribe('themes.lastSelectedTheme', () => {
      this.expand();
    });

    // Toggle to dark mode when needed
    this.subscribe('interface.darkFrontendMode', (_waDarkMode: boolean, isDarkMode: boolean) => {
      const container = this.shadow.querySelector('.title-container') as HTMLDivElement;

      if (isDarkMode) {
        container.classList.add('dark-mode');
      } else {
        container.classList.remove('dark-mode');
      }
    });
  }

  private countActiveLayers() {
    this.numberActiveLayer = LayerManager.getInstance()
      .getFlattenedLayerTree(this.state.layers.layersList)
      .filter((l) => {
        return !(l instanceof ThemeLayer || l instanceof GroupLayer);
      })
      .filter((l) => l.active).length;
  }

  toggleCollapse(e: PointerEvent) {
    e.stopPropagation();

    if (this.collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  collapse() {
    const grid = this.shadow.querySelector('.layer-list') as HTMLDivElement;
    grid.style.setProperty('max-height', '0px');
    this.collapsed = true;
    this.render();
  }

  expand() {
    const grid = this.shadow.querySelector('.layer-list') as HTMLDivElement;
    grid.style.setProperty('max-height', `${grid.scrollHeight}px`);
    this.collapsed = false;
    this.render();
  }
}
