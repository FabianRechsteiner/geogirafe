class Basemap {
  id: number;
  name: string;

  // Layers
  layersList: any[] = [];

  constructor(elem: { id: number, name: string}) {
    this.id = elem.id;
    this.name = elem.name;
  }

  get projection(): string | undefined {
    return this.layersList[0].projection;
  }
}

export default Basemap;
