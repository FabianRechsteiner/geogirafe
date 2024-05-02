// Helper file to select the DOM Html Element.

export const getLidarProfileContainer = (): HTMLElement | null | undefined => {
  return document.querySelector('#lidar-footer')?.shadowRoot?.querySelector('#gmf-lidarprofile-container');
};
export const getLidarProfileCanvas = (): HTMLElement | null | undefined => {
  return getLidarProfileContainer()?.querySelector('.lidar-canvas');
};
export const getLidarProfileSvg = (): HTMLElement | null | undefined => {
  return getLidarProfileContainer()?.querySelector('svg.lidar-svg');
};
export const getLidarProfileError = (): HTMLElement | null | undefined => {
  return getLidarProfileContainer()?.querySelector('.lidar-error');
};
export const getLidarProfileLodInfo = (): HTMLElement | null | undefined => {
  return getLidarProfileContainer()?.querySelector('.lod-info');
};
export const getLidarProfileWidthInfo = (): HTMLElement | null | undefined => {
  return getLidarProfileContainer()?.querySelector('.width-info');
};
