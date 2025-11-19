import LZString from 'lz-string';
import Basemap from '../../models/basemaps/basemap';
import MapPositionSerializer from './serializers/mappositionserializer';
import MapPosition from '../state/mapposition';
import GlobeState from '../state/globe';
import LayersConfig from '../state/layersConfig';
import LayersConfigSerializer from './serializers/layerconfigserializer';
import ActiveBasemapsSerializer from './serializers/activebasemapsserializer';
import State, { ExtendedState } from '../state/state';
import GirafeSingleton from '../../base/GirafeSingleton';
import BrainSerializer, { Constructor, IBrainSerializer } from '../state/brain/serialize';
import SelectionSerializer from './serializers/selectionserializer';
import ObjectSelection from '../state/objectselection';
import GraphicalInterface from '../state/graphicalInterface';
import InterfaceSerializer from './serializers/interfaceserializer';
import GlobeSerializer from './serializers/globeserializer';

class StateSerializer extends GirafeSingleton {
  private readonly brainSerializer = new BrainSerializer<State | ExtendedState>();

  override initializeSingleton() {
    this.addSerializer(Array<Basemap>, new ActiveBasemapsSerializer(this.context));
    this.addSerializer(MapPosition, new MapPositionSerializer(this.context));
    this.addSerializer(LayersConfig, new LayersConfigSerializer(this.context));
    this.addSerializer(ObjectSelection, new SelectionSerializer(this.context));
    this.addSerializer(GraphicalInterface, new InterfaceSerializer(this.context));
    this.addSerializer(GlobeState, new GlobeSerializer(this.context));
  }

  public addSerializer(type: Constructor<object>, serializerData: IBrainSerializer<object>): void {
    this.brainSerializer.addSerializer(type, serializerData);
  }

  public getSerializedState(): string {
    const stringState = this.serialize();
    const compressedState = LZString.compressToBase64(stringState);
    return compressedState;
  }

  public deserializeAndSetState(compressedState: string): boolean {
    try {
      const stringState = LZString.decompressFromBase64(compressedState);
      this.deserialize(stringState);
      return true;
    } catch (e) {
      console.warn(e);
      console.warn('Cannot deserialized state. The default configuration will be used.');
      return false;
    }
  }

  private serialize(): string {
    const currentState = this.context.stateManager.state;
    const serializedState = this.brainSerializer.serialize(currentState);
    const serializedExtendedState = this.brainSerializer.serialize(this.context.stateManager.state.extendedState);

    const compressedState = LZString.compressToBase64(serializedState);
    const compressedExtendedState = LZString.compressToBase64(serializedExtendedState);
    return `${compressedState}-${compressedExtendedState}`;
  }

  private deserialize(compressedStateWithExtended: string) {
    const compressed = compressedStateWithExtended.split('-');
    if (compressed.length > 2) {
      throw new Error(
        'There should only be 2 parts in the compressed state: state and extended-state. It should never be longer than that.'
      );
    }
    const compressedState = compressed[0];
    const compressedExtendedState = compressed[1];

    const serializedState = LZString.decompressFromBase64(compressedState);
    const serializedExtendedState = LZString.decompressFromBase64(compressedExtendedState);

    this.context.stateManager.batchChanges(() => {
      this.brainSerializer.deserialize(serializedState, this.context.stateManager.state);
      if (serializedExtendedState) {
        this.brainSerializer.deserialize(serializedExtendedState, this.context.stateManager.state.extendedState);
      }
    });
  }
}

export default StateSerializer;
