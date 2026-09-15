// SPDX-License-Identifier: Apache-2.0
interface ILayerWithLegend {
  legend: boolean;
  legendImage?: string;
  isLegendExpanded: boolean;
  wasLegendExpanded: boolean;
}

export default ILayerWithLegend;
