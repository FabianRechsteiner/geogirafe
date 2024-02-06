class SearchResult {
  // TODO REG : What should we do with this type ? Make it compatible to the structure of search results ?
  /*type: string;*/
  bbox?: [number, number, number, number];
  //id: number;
  /*geometry: {
    type: string;
    coordinates: [number, number];
  };*/
  properties?: {
    label: string;
    layer_name: string;
    actions: {
      action: string;
      data: string;
    }[];
  };

  /*constructor(elem: any) {
    this.type = elem.type;
    this.bbox = elem.features;
    this.id = elem.features;
    this.geometry = elem.geometry;
    this.properties = elem.features;
  }*/
}

export default SearchResult;
