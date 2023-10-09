import BaseLayer from './baselayer';

class Layer extends BaseLayer {

  public activeState: 'on' | 'off' = 'off';
  public opacity: number = 1;
  public order: number = 0;

  // Is this layer used as basemap ?
  basemap = false;

  constructor(elem: any, order: number) {
    const isDefaultChecked = elem.metadata?.isChecked ?? false;
    super(elem.id, elem.name, order, isDefaultChecked);
  }

  get isTransparent() {
    return (this.opacity !== 1);
  }

  get active() {
    return this.activeState === 'on';
  }

  get inactive() {
    return this.activeState === 'off';
  }
}

export default Layer;
