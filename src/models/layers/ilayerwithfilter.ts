interface ILayerWithFilter {
  filter: string | null;
  get hasFilter(): boolean;
}

export default ILayerWithFilter;
