export type CameraConfig = {
  heading: number;
  pitch: number;
  roll: number;
};

export default class GlobeState {
  display: '2D' | '3D' | '2D/3D' = '2D';
  loaded = false;
  shadows = false;
  shadowsTimestamp = Date.now();
  camera: CameraConfig | null = null;
}
