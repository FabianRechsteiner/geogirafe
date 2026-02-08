/**
 * Known Functionalities which are allowed in <code>GMFTheme.functionalities</code> and are published to
 * <code>State.functionalities</code>. Subscribe a Handler to get notified when a Theme which such a Functionality is
 * selected by the User (e.g., Change the Basemap):
 * <code>
 * GirafeHTMLElement.subscribe('functionalities.default_basemap', (oldValue: string[], newValue: string[]) => {
 *   ...
 * });
 * </code>
 */
export const KNOWN_FUNCTIONALITIES = ['default_basemap'];
