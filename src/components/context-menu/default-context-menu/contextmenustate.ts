// SPDX-License-Identifier: Apache-2.0
export class MapContextMenuState {
  visible: boolean = false;
  position!: [number, number];
  projection: string | null = null;
  crs: {
    code: string;
    translation: string;
    format: 'decimal' | 'dms';
    precision: number;
    coordinate: [number, number];
  }[] = [];
  sources: {
    id: string;
    url: string;
    crs: string;
    translation: string;
    content: string | null;
    loading: boolean;
  }[] = [];
  links: {
    url: string;
    crs: string;
    translation: string;
    content: string | null;
  }[] = [];
}
