// SPDX-License-Identifier: Apache-2.0
import Picker, { Options } from 'vanilla-picker';

class GirafeColorPicker extends Picker {
  declare private readonly domElement: HTMLElement;
  private readonly parent?: HTMLElement;
  private readonly fixedPosition: boolean;

  /**
   *
   * @param options picker options
   * @param fixedPosition set this to true to compensate for overflow issues in panels
   */
  public constructor(options: Options, fixedPosition = false) {
    super(options);
    this.parent = options.parent;
    this.fixedPosition = fixedPosition;
  }

  public override openHandler(e: PointerEvent) {
    /**
     * This is a fix for color picker display in panels with overflow.
     * There is a CSS limitation when using overflow :
     * we cannot have an overflow-y scrollable and at the same time an overflow-x visible.
     * It just doesn't work as explain here for example:
     * https://www.reddit.com/r/css/comments/1b9jyvx/overflowy_scroll_overflowx_visible_at_same_time/
     * But we need this in our case, because the panel must be scrollable,
     * and the picker must stay visible when opened.
     * To solve this, we have to display the color-picker as 'fixed' to escape
     * the encapsulation of the parent component.
     * This can at the moment only be done by overriding the openHandler() method
     * of the vanilla-picker component:
     * https://github.com/Sphinxxxx/vanilla-picker/issues/24.
     */
    super.openHandler(e);
    if (this.fixedPosition && e.target === this.parent) {
      this.domElement.classList.add('fixedPosition');
      this.domElement.getElementsByClassName('picker_arrow')[0].classList.add('fixedPosition');
      this.domElement.style.position = 'fixed';
      const left = this.parent.getBoundingClientRect().left + this.parent.getBoundingClientRect().width;
      const bottom =
        window.innerHeight - (this.parent.getBoundingClientRect().bottom - this.parent.getBoundingClientRect().height);
      this.domElement.style.left = `${left}px`;
      this.domElement.style.bottom = `${bottom}px`;
    }
  }
}

export default GirafeColorPicker;
