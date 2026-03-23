// SPDX-License-Identifier: Apache-2.0
import GirafeHTMLElement from '../../base/GirafeHTMLElement';

export default interface IGirafePanel {
  isPanelVisible: boolean;
  panelTitle: string;
  panelTogglePath: string;
  togglePanel(isVisible: boolean): void;
}

export function isGirafePanel(element: IGirafePanel | GirafeHTMLElement | Node): element is IGirafePanel {
  return (<IGirafePanel>element).panelTogglePath !== undefined;
}
