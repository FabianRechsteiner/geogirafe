// SPDX-License-Identifier: Apache-2.0
/**
 * The pannel can be:
 * - "closed": it is invisible, below screen
 * - "reduced": only a small tray is visible at the bottom of the screen
 * - "half": about half of the screen
 * - "full": the pannel is fully open, covering up to almost the top of the screen
 * - "manual": a state reserved for when the panel handle was used to manually adjust the panel height
 */
export type SwipeupPanelMode = 'closed' | 'reduced' | 'half' | 'full' | 'manual';
