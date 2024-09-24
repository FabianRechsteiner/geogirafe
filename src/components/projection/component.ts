import GirafeHTMLElement from '../../base/GirafeHTMLElement';

class ProjectionComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = '../../styles/common.css';

  projections: Record<string, string> = {};

  constructor() {
    super('projection');
  }

  render() {
    // Get projections list and store it
    this.projections = this.configManager.Config.projections;

    super.render();

    // Hide menu button if only one projection
    if (Object.keys(this.projections).length == 1) {
      (this.shadow.host as GirafeHTMLElement).hide();
    }
  }

  changeProjection(projection: string) {
    console.log('change projection', projection);
    this.state.projection = projection;
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      this.render();
      super.girafeTranslate();
    });
  }
}

export default ProjectionComponent;
