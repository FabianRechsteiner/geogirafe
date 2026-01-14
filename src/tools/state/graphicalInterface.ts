import { SwipeupPanelMode } from './swipeuppanelmode';
import { systemIsInDarkMode } from '../utils/utils';

export default class GraphicalInterface {
  public isMobile = false;
  public helpVisible = false;
  public drawingPanelVisible = false;
  public offlinePanelVisible = false;
  public printPanelVisible = false;
  public extLayerPanelVisible = false;
  public crossSectionPanelVisible = false;
  public editPanelVisible = false;
  public sharePanelVisible = false;
  public selectionComponentVisible = false;
  public selectionComponent = '';
  public layoutPanelVisible = false;
  public aboutPanelVisible = false;
  public userPreferencesPanelVisible = false;
  public infoWindowVisible = false;
  public searchComponentVisible = true;
  public basemapComponentVisible = true;
  public darkMapMode = false;
  public selectionToolPanelVisible = false;
  // TODO: remove of adjust this when the component UserDataManager is monted on mobile UI
  public darkFrontendMode = systemIsInDarkMode() ?? false;
  public swipeupPanelMode: SwipeupPanelMode = 'closed';
  public contactPanelVisible = false;
  public swipeupPanelContent: 'selector' | 'features' | 'menu' | 'drawing' | 'offline' | null = 'selector';
}
