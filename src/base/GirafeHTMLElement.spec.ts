import { describe, it, beforeAll, assert, afterAll } from 'vitest';
import GirafeHTMLElement from './GirafeHTMLElement';
import MockHelper from '../tools/tests/mockhelper';

describe('GirafeHTMLElement.getUnsafeTemplate', () => {
  beforeAll(() => {
    MockHelper.startMocking();
    customElements.define('girafe-test', GirafeHTMLElement);
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  it('should create two different templates', () => {
    const element = new GirafeHTMLElement('girafe-test');
    // @ts-ignore
    const template1 = element.getUnsafeTemplate('toto');
    // @ts-ignore
    const template2 = element.getUnsafeTemplate('titi');

    assert.notStrictEqual(template1, template2);
  });

  it('should return cached object and not create a new one', () => {
    const element = new GirafeHTMLElement('girafe-test');
    const str = 'toto';
    // @ts-ignore
    const template1 = element.getUnsafeTemplate(str);
    // @ts-ignore
    const template2 = element.getUnsafeTemplate(str);

    assert.strictEqual(template1, template2);
  });
});
