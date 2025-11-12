import LayerWmsExternal from './layerwmsexternal';
import LayerWmtsExternal from './layerwmtsexternal';
import ThemeLayer from './themelayer';

export default class ThemeLayerExternal extends ThemeLayer {
  static nextAvailableThemeId = 30000000;

  constructor(name?: string) {
    const id = ThemeLayerExternal.nextAvailableThemeId++;
    super(id, name ?? 'Unknown external service', 0);
  }

  override children: (LayerWmtsExternal | LayerWmsExternal)[] = [];
}
