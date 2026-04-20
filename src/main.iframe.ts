// SPDX-License-Identifier: Apache-2.0
import { SplashScreen } from './main.tools';
import GeoGirafeApp from './tools/app/geogirafeapp';
import { ensurePmtilesProtocolRegistered } from './tools/utils/pmtiles';

// Display the splash-screen
const splash = new SplashScreen();
splash.begin();
ensurePmtilesProtocolRegistered();

const girafeApp = new GeoGirafeApp(true);
girafeApp.isReady().then(() => {
  // Remove the splash-screen
  splash.end();
});
