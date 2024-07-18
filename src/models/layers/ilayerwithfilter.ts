import WfsFilter from '../../tools/wfs/wfsfilter';

interface ILayerWithFilter {
  filter?: WfsFilter;
  get hasFilter(): boolean;
}

export default ILayerWithFilter;
