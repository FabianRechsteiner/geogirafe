import { IBrainSerializer } from '../../state/brain/serialize';
import ObjectSelection, { InitialSelectionQuery } from '../../state/objectselection';
import WfsFilter from '../../wfs/wfsfilter';
import SelectionParam from '../../../models/selectionparam';
import IGirafeContext from '../../context/icontext';
import { SharedFilter } from './sharedtypes';

export type SharedInitialSelection = {
  selectionBox?: number[];
  selectionQuery?: {
    query: SharedFilter[];
    layerName: string;
  };
};

export default class SelectionSerializer implements IBrainSerializer<ObjectSelection> {
  private readonly context: IGirafeContext;

  constructor(context: IGirafeContext) {
    this.context = context;
  }

  private get state() {
    return this.context.stateManager.state;
  }

  public brainSerialize(selection: ObjectSelection): string {
    if (selection.selectionParameters.length > 0) {
      // Note: Currently only the first selection parameter is serialized
      return JSON.stringify(this.getSerializedSelectionParameter(selection.selectionParameters[0]));
    }
    return '';
  }

  public brainDeserialize(str: string) {
    if (str.trim().length > 0) {
      const shareState: SharedInitialSelection = JSON.parse(str);
      if (shareState.selectionQuery) {
        this.state.selection.initialSelectionQuery = this.getDeserializedSelectionQuery(shareState);
      } else if (shareState.selectionBox) {
        this.state.selection.initialSelectionBox = shareState.selectionBox;
      }
    }
  }

  private getSerializedSelectionParameter(selectionParam: SelectionParam): SharedInitialSelection {
    let serializedSelectionQuery = undefined;
    if (selectionParam.selectionQuery) {
      serializedSelectionQuery = {
        query: selectionParam.selectionQuery.map((q) => q as SharedFilter),
        layerName: selectionParam._layers[0].name
      };
    }
    return {
      selectionBox: selectionParam.selectionBox ?? undefined,
      selectionQuery: serializedSelectionQuery
    };
  }

  private getDeserializedSelectionQuery(sharedSelection: SharedInitialSelection): InitialSelectionQuery | undefined {
    if (!sharedSelection.selectionQuery) {
      return undefined;
    }
    return {
      query: sharedSelection.selectionQuery.query.map(
        (q: SharedFilter) => new WfsFilter(q.property, q.operator, q.value, q.value2, q.propertyType)
      ),
      layerName: sharedSelection.selectionQuery?.layerName
    };
  }
}
