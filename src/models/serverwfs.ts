export type LayerAttribute = {
  name: string;
  type: 'string' | 'integer' | 'double' | 'long' | 'date';
}

class ServerWfs {
  
  name: string;
  url: string;
  layers: Record<string, LayerAttribute[]>;
  initialized: boolean;

  constructor(name: string, url: string) {
    this.name = name;
    this.url = url;
    this.layers = {};
    this.initialized = false;
  }

  addLayerAttribute(layer: string, name: string, type: string) {

    if (!['string', 'integer', 'double', 'long', 'date'].includes(type)) {
      console.warn(`Unmanaged attribute type: ${type}.`);
      return;
    }

    if (!(layer in this.layers)) {
      // Layer does not exists yet
      this.layers[layer] = [];
    }

    this.layers[layer].push({
      name: name,
      type: type as 'string' | 'integer' | 'double' | 'long' | 'date'
    })
  }
}

export default ServerWfs;
