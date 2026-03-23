// SPDX-License-Identifier: Apache-2.0
export interface MFPCapabilitiesLayoutAttribute {
  name: string;
  default?: string | boolean | number;
  value?: string;
  type: string;
  clientParams?: {
    [key: string]: MFPCapabilitiesLayoutAttributeClientParamsElement;
  };
  clientInfo?: MFPCapabilitiesLayoutAttributeClientInfo;
}

export interface MFPCapabilitiesLayoutAttributeClientInfo {
  dpiSuggestions: number[];
  scales: number[];
  maxDpi: number;
  width: number;
  height: number;
}

interface MFPCapabilitiesLayoutAttributeClientParamsElement {
  default?: string | boolean | number;
  type: string;
  isArray?: boolean;
  embeddedType?: {
    [key: string]: MFPCapabilitiesLayoutAttributeClientParamsElement;
  };
}

export interface MFPCapabilitiesLayout {
  attributes: MFPCapabilitiesLayoutAttribute[];
  name: string;
}

interface MFPCapabilitiesSMTP {
  enabled: boolean;
}

export interface MFPCapabilities {
  layouts: MFPCapabilitiesLayout[];
  formats: string[];
  smtp?: MFPCapabilitiesSMTP;
}

interface MFPPrintDatasourceTable {
  columns: string[];
  data: unknown[][];
}

export interface MFPPrintDatasource {
  title: string;
  table: MFPPrintDatasourceTable;
}
