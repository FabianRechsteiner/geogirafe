export type CameraConfig = {
  heading: number;
  pitch: number;
  roll: number;
};

export default class GlobeState {
  public display: '2D' | '3D' | '2D/3D' = '2D';
  public loaded = false;
  public shadows = false;
  public shadowsTimestamp = Date.now();
  public camera: CameraConfig | null = null;
}
