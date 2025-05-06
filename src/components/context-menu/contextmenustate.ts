export class MapContextMenuState {
  position: [number, number] | null = null;
  projection: string | null = null;
  crs: {
    code: string;
    translation: string;
    format: 'decimal' | 'dms';
    precision: number;
  }[] = [];
  sources: {
    id: string;
    url: string;
    crs: string;
    translation: string;
    content: string | null;
  }[] = [];
}
