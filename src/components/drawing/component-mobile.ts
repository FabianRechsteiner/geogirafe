import DrawingComponent from './component';

export default class DrawingComponentMobile extends DrawingComponent {
  templateUrl = './template.html';
  styleUrls = ['../../styles/common.css', './style.css', './style-mobile-delta.css'];

  constructor() {
    super('drawing-mobile');
  }
}
