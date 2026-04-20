// SPDX-License-Identifier: Apache-2.0
import LayerWmsExternal from './layerwmsexternal';
import LayerWmtsExternal from './layerwmtsexternal';
import ThemeLayer from './themelayer';

export default class ThemeLayerExternal extends ThemeLayer {
  private static nextAvailableThemeId = 30000000;

  public constructor(name?: string) {
    const id = ThemeLayerExternal.nextAvailableThemeId++;
    super(id, name ?? 'Unknown external service', 0);
  }

  public override children: (LayerWmtsExternal | LayerWmsExternal)[] = [];
}
