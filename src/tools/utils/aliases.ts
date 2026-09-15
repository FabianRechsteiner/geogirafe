// SPDX-License-Identifier: Apache-2.0
import StateManager from '../state/statemanager';

export default class ColumnAliasHelper {
  private readonly stateManager: StateManager;

  public constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  public getColumnAlias(idTable: string, idColumn: string) {
    for (const ogcServer of Object.values(this.stateManager.state.ogcServers)) {
      const alias = ogcServer.getAlias(idTable, idColumn);
      if (alias) {
        return alias;
      }
    }
    return idColumn;
  }
}
