interface ILayerWithFilter {
  filter?: string;
  get hasFilter(): boolean;
}

export default ILayerWithFilter;
