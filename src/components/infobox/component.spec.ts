import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import InfoboxComponent from './component';
import MockHelper from '../../tools/tests/mockhelper';

describe('InfoboxComponent.linkify', () => {
  let infobox: InfoboxComponent;

  beforeAll(() => {
    MockHelper.startMocking();
    if (!customElements.get('infobox-component')) {
      customElements.define('infobox-component', InfoboxComponent);
    }
    infobox = new InfoboxComponent();
  });

  afterAll(() => {
    MockHelper.stopMocking();
  });

  it('should return plain link wrapped in Anchor-Element', () => {
    const plainLink = 'https://gitlab.com/geogirafe/gg-viewer/';
    const linkifiedLink = infobox.linkify(plainLink);
    expect(linkifiedLink).toEqual(
      '<a href="https://gitlab.com/geogirafe/gg-viewer/" target="_blank">https://gitlab.com/geogirafe/gg-viewer/</a>'
    );
  });

  it('should return already wrapped link unchanged', () => {
    const alreadyWrappedLink =
      '<a href="https://gitlab.com/geogirafe/gg-viewer/">https://gitlab.com/geogirafe/gg-viewer/</a>';
    const linkifiedLink = infobox.linkify(alreadyWrappedLink);
    expect(linkifiedLink).toEqual(alreadyWrappedLink);
  });
});
