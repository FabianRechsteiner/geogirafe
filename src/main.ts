import tippy from 'tippy.js';
import AboutComponent from './components/about/component';
import BasemapComponent from './components/basemap/component';
import CoordinateComponent from './components/coordinate/component';
import CrossSectionSettingsComponent from './components/cross-section/cross-section-settings/component';
import CrossSectionViewComponent from './components/cross-section/cross-section-viewer/component';
import DrawingComponent from './components/drawing/component';
import HelpComponent from './components/help/component';
import InfoboxComponent from './components/infobox/component';
import InfoWindowComponent from './components/infowindow/component';
import LayoutComponent from './components/layout/component';
import LRPanelComponent from './components/lr-panel/component';
import MapComponent from './components/map/component';
import MenuButtonComponent from './components/menubutton/component';
import ModalsComponent from './components/modals/component';
import NavigationComponent from './components/navigation/component';
import OauthComponent from './components/auth/component';
import PrintComponent from './components/print/component';
import PrototypeBannerComponent from './components/prototypebanner/component';
import QueryBuilderComponent from './components/querybuilder/component';
import ScaleComponent from './components/scale/component';
import SearchComponent from './components/search/component';
import SelectionGridComponent from './components/selectiongrid/component';
import SelectionWindowComponent from './components/selectionwindow/component';
import ShareComponent from './components/share/component';
import ThemeComponent from './components/themes/component';
import TreeViewGroupComponent from './components/treeview/treeviewgroup/component';
import TreeViewItemComponent from './components/treeview/treeviewitem/component';
import TreeViewRootComponent from './components/treeview/treeviewroot/component';
import TreeViewThemeComponent from './components/treeview/treeviewtheme/component';
import UserPreferencesComponent from './components/userpreferences/component';
import VideoRecordComponent from './components/videorecord/component';
import { initialize } from './initialize';

// Redirect to mobile interface if we are on mobile
if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('Android')) {
  window.location.href = 'mobile.html';
}

// Common initialization
initialize().then(() => {
  // Override default tooltip maxWidth:
  tippy.setDefaultProps({ maxWidth: '' });

  // Define components names
  customElements.define('girafe-about', AboutComponent);
  customElements.define('girafe-basemap', BasemapComponent);
  customElements.define('girafe-coordinate', CoordinateComponent);
  customElements.define('girafe-layout', LayoutComponent);
  customElements.define('girafe-help', HelpComponent);
  customElements.define('girafe-infobox', InfoboxComponent);
  customElements.define('girafe-info-window', InfoWindowComponent);
  customElements.define('girafe-cross-section-settings', CrossSectionSettingsComponent);
  customElements.define('girafe-cross-section-view', CrossSectionViewComponent);
  customElements.define('girafe-lr-panel', LRPanelComponent);
  customElements.define('girafe-map', MapComponent);
  customElements.define('girafe-menu-button', MenuButtonComponent);
  customElements.define('girafe-modals', ModalsComponent);
  customElements.define('girafe-nav-history', NavigationComponent);
  customElements.define('girafe-print', PrintComponent);
  customElements.define('girafe-prototype-banner', PrototypeBannerComponent);
  customElements.define('girafe-query-builder', QueryBuilderComponent);
  customElements.define('girafe-oauth', OauthComponent);
  customElements.define('girafe-drawing', DrawingComponent);
  customElements.define('girafe-scale', ScaleComponent);
  customElements.define('girafe-search', SearchComponent);
  customElements.define('girafe-selection-grid', SelectionGridComponent);
  customElements.define('girafe-selection-window', SelectionWindowComponent);
  customElements.define('girafe-share', ShareComponent);
  customElements.define('girafe-theme-select', ThemeComponent);
  customElements.define('girafe-tree-view', TreeViewRootComponent);
  customElements.define('girafe-tree-view-group', TreeViewGroupComponent);
  customElements.define('girafe-tree-view-item', TreeViewItemComponent);
  customElements.define('girafe-tree-view-theme', TreeViewThemeComponent);
  customElements.define('girafe-user-preferences', UserPreferencesComponent);
  customElements.define('girafe-video-record', VideoRecordComponent);

  // To prevent the FOUC effect (flash of unstyled content),
  // the html element is set to invisible when the application starts.
  // When all elements have been declared, the html element is made visible
  document.documentElement.style.opacity = '1';
});
