import StateManager from '../state/statemanager';

export function getColumnAlias(idTable: string, idColumn: string) {
  for (const ogcServer of Object.values(StateManager.getInstance().state.ogcServers)) {
    const alias = ogcServer.getAlias(idTable, idColumn);
    if (alias) {
      return alias;
    }
  }
  return idColumn;
}
