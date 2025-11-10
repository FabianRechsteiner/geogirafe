import { SwipeupPanelMode } from './swipeuppanelmode';
import { systemIsInDarkMode } from '../utils/utils';

export default class GraphicalInterface {
  isMobile = false;
  helpVisible = false;
  drawingPanelVisible = false;
  printPanelVisible = false;
  extLayerPanelVisible = false;
  crossSectionPanelVisible = false;
  editPanelVisible = false;
  sharePanelVisible = false;
  selectionComponentVisible = false;
  selectionComponent = '';
  layoutPanelVisible = false;
  aboutPanelVisible = false;
  userPreferencesPanelVisible = false;
  infoWindowVisible = false;
  searchComponentVisible = true;
  basemapComponentVisible = true;
  darkMapMode = false;
  // TODO: remove of adjust this when the component UserDataManager is monted on mobile UI
  darkFrontendMode = systemIsInDarkMode() ?? false;
  swipeupPanelMode: SwipeupPanelMode = 'closed';
  contactPanelVisible = false;
  swipeupPanelContent: 'selector' | 'features' | 'menu' | 'drawing' | 'offline' | null = 'selector';
}
