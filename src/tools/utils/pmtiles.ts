// SPDX-License-Identifier: Apache-2.0
import { register } from 'pmtiles-protocol';

declare global {
  interface Window {
    __geogirafePmtilesRegistered__?: boolean;
  }
}

export function ensurePmtilesProtocolRegistered() {
  if (window.__geogirafePmtilesRegistered__) {
    return;
  }
  register();
  window.__geogirafePmtilesRegistered__ = true;
}
