import tippy from 'tippy.js';
import AboutComponent from './components/about/component';
import BasemapComponent from './components/basemap/component';
import CoordinateComponent from './components/coordinate/component';
import ContactComponent from './components/contact/component';
import MapDefaultContextMenuComponent from './components/context-menu/default-context-menu/component';
import MapCustomContextMenuComponent from './components/context-menu/custom-context-menu/component';
import CrossSectionSettingsComponent from './components/cross-section/cross-section-settings/component';
import CrossSectionViewComponent from './components/cross-section/cross-section-viewer/component';
import DrawingComponent from './components/drawing/component';
import EditComponent from './components/edit/component';
import EditFromComponent from './components/edit/editform/component';
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
import TimeRestrictionComponent from './components/timerestriction/component';
import TimePickerComponent from './components/timerestriction/timepicker/component';
import TimeSliderComponent from './components/timerestriction/timeslider/component';
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

document.addEventListener('DOMContentLoaded', function () {
  // At this point, the config and translations have not been loaded yet
  // Therefore, we hardcode this simple 'loading' text and use the browser configuration
  const language = navigator.language.toLowerCase();
  console.log(`Navigator language: ${language}`);
  let loading = 'Loading...';
  if (language.startsWith('fr')) {
    loading = 'Chargement...';
  } else if (language.startsWith('de')) {
    loading = 'Wird geladen...';
  } else if (language.startsWith('it')) {
    loading = 'Caricamento...';
  }
  (document.getElementById('splash-screen')?.getElementsByTagName('span')[0] as HTMLElement).innerHTML = loading;
});

// Common initialization
initialize().then(() => {
  // Override default tooltip maxWidth:
  tippy.setDefaultProps({ maxWidth: '' });

  // Define components names
  customElements.define('girafe-about', AboutComponent);
  customElements.define('girafe-basemap', BasemapComponent);
  customElements.define('girafe-coordinate', CoordinateComponent);
  customElements.define('girafe-contact', ContactComponent);
  customElements.define('girafe-default-context-menu', MapDefaultContextMenuComponent);
  customElements.define('girafe-custom-context-menu', MapCustomContextMenuComponent);
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
  customElements.define('girafe-edit', EditComponent);
  customElements.define('girafe-edit-form', EditFromComponent);
  customElements.define('girafe-scale', ScaleComponent);
  customElements.define('girafe-search', SearchComponent);
  customElements.define('girafe-selection-grid', SelectionGridComponent);
  customElements.define('girafe-selection-window', SelectionWindowComponent);
  customElements.define('girafe-share', ShareComponent);
  customElements.define('girafe-theme-select', ThemeComponent);
  customElements.define('girafe-time-restriction', TimeRestrictionComponent);
  customElements.define('girafe-time-picker', TimePickerComponent);
  customElements.define('girafe-time-slider', TimeSliderComponent);
  customElements.define('girafe-tree-view', TreeViewRootComponent);
  customElements.define('girafe-tree-view-group', TreeViewGroupComponent);
  customElements.define('girafe-tree-view-item', TreeViewItemComponent);
  customElements.define('girafe-tree-view-theme', TreeViewThemeComponent);
  customElements.define('girafe-user-preferences', UserPreferencesComponent);
  customElements.define('girafe-video-record', VideoRecordComponent);

  // Remove the splash-screen from the DOM
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 700);
  }
});
