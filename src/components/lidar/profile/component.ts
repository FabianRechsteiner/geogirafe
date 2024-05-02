import GirafeResizableElement from '../../../base/GirafeResizableElement';
import OlGeomLineString from 'ol/geom/LineString';

/**
 * Container to draw the Lidar profile.
 */
class LidarProfileComponent extends GirafeResizableElement {
  templateUrl = './template.html';
  styleUrl = './style.css';
  private visible = false;

  constructor() {
    super('lidar-profile');
  }

  connectedCallback() {
    this.render();
    this.registerVisibilityEvents();
  }

  /**
   * Render the component regarding its visibility.
   * Fetch the print capabilities at first rendering, then render the print mask too and register to events.
   */
  render() {
    this.visible ? super.render() : this.renderEmpty();
  }

  /**
   * Close the panel by removing the lidar line.
   */
  closePanel() {
    this.state.lidar.line = null;
  }

  /**
   * Event about visibility that must be always listened by this component, even hidden.
   * @private
   */
  private registerVisibilityEvents() {
    this.stateManager.subscribe('lidar.line', (_oldValue, newValue) => this.togglePanel(newValue));
  }

  /**
   * Set the visibility of the panel.
   * @private
   */
  private async togglePanel(line: OlGeomLineString): Promise<void> {
    this.visible = !!line;
    this.render();
  }
}

export default LidarProfileComponent;
