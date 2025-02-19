import { beforeAll, describe, expect, it } from 'vitest';
import InfoWindowComponent from './component';
import MockHelper from '../../tools/tests/mockhelper';

describe('InfoWindowComponent.configToCssValue', () => {
  let infoWindow: InfoWindowComponent;

  beforeAll(() => {
    MockHelper.startMocking();
    if (!customElements.get('girafe-info-window')) {
      customElements.define('girafe-info-window', InfoWindowComponent);
    }
    infoWindow = new InfoWindowComponent();
  });

  it('should return a valid css value from a config setting', () => {
    let result = infoWindow['configToCssValue']('230px');
    expect(result).toEqual('230px');

    result = infoWindow['configToCssValue']('2.6rem');
    expect(result).toEqual('2.6rem');

    result = infoWindow['configToCssValue']('0.5em');
    expect(result).toEqual('0.5em');

    result = infoWindow['configToCssValue']('80%');
    expect(result).toEqual('80%');

    result = infoWindow['configToCssValue']('230 px');
    expect(result).toEqual('230px');

    result = infoWindow['configToCssValue']('500');
    expect(result).toEqual('500px');
  });

  it('should return null if config setting is not a valid CSS value', () => {
    let result = infoWindow['configToCssValue']('2.6remm');
    expect(result).toEqual(null);

    result = infoWindow['configToCssValue']('abcdef');
    expect(result).toEqual(null);

    result = infoWindow['configToCssValue']('');
    expect(result).toEqual(null);

    result = infoWindow['configToCssValue'](null);
    expect(result).toEqual(null);

    result = infoWindow['configToCssValue']('-100px');
    expect(result).toEqual(null);

    result = infoWindow['configToCssValue']('.px');
    expect(result).toEqual(null);

    result = infoWindow['configToCssValue'](0);
    expect(result).toEqual(null);
  });
});
