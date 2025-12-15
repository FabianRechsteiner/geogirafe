import DrawingComponent from './component';

export default class DrawingComponentMobile extends DrawingComponent {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css', './style-mobile-delta.css'];

  public constructor() {
    super('drawing-mobile');
  }
}
