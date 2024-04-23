import { it, expect, describe } from 'vitest';
import PrintComponent from './component';

describe('PrintComponent', () => {
  it('filterValidPrintFormats', () => {
    const availableFormats = ['pdf', 'svg', 'png'];
    const configFormats = ['png', 'jpg'];
    const results = PrintComponent.filterValidPrintFormats(configFormats, availableFormats);
    expect(results).toEqual(['png']);
  });

  it('getValidDefaultFormat', async () => {
    const formats = ['pdf', 'png', 'svg'];

    let result = PrintComponent.getValidDefaultFormat(formats, 'pdf');
    expect(result).toBe('pdf');

    result = PrintComponent.getValidDefaultFormat(formats, 'txt');
    expect(result).toBe(formats[0]);
  });

  describe('filterValidLayout', () => {
    const availableLayouts = [
      { attributes: [], name: 'A4 Portrait' },
      { attributes: [], name: 'A3 Landscape' }
    ];

    it('filterValidLayout, with config', () => {
      const configLayouts = ['A4 Portrait', 'A10 Land'];
      const filteredLayouts = PrintComponent.filterValidLayouts(availableLayouts, configLayouts);
      expect(filteredLayouts.length).toBe(1);
      expect(filteredLayouts[0].name).toBe('A4 Portrait');
    });

    it('filterValidLayout, without config', () => {
      const filteredLayouts = PrintComponent.filterValidLayouts(availableLayouts);
      expect(filteredLayouts.length).toBe(2);
    });
  });

  describe('filterValidScales', () => {
    const availableScales = [100, 2500, 5000, 25000];

    it('filterValidScales, with config', () => {
      const configScales = [100, 1000, 5000, 10000, 25000];
      const filteredScales = PrintComponent.filterValidScales(availableScales, configScales);
      expect(filteredScales.length).toBe(3);
      expect(filteredScales).toEqual([100, 5000, 25000]);
    });

    it('filterValidScales, without config', () => {
      const filteredLayouts = PrintComponent.filterValidScales(availableScales);
      expect(filteredLayouts.length).toBe(4);
    });
  });
});
