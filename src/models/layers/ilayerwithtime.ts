// SPDX-License-Identifier: Apache-2.0
import ITimeOptions from '../../tools/time/itimeoptions';

/**
 * Layer that has a temporal dimension and can be filtered by specifying a TIME URL parameter.
 * Filter arguments are date strings (simple value or time range) and saved in property timeRestriction.
 */
interface ILayerWithTime {
  timeOptions?: ITimeOptions;
  timeRestriction?: string;

  get hasTimeRestriction(): boolean;

  setDefaultTimeRestriction(): void;
}

export default ILayerWithTime;
