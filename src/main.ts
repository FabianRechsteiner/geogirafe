// SPDX-License-Identifier: Apache-2.0
import { redirectTo, SplashScreen } from './main.tools';
import GeoGirafeApp from './tools/app/geogirafeapp';

const shouldSkipRedirect = new URLSearchParams(globalThis.location.search).has('no_redirect');

// Redirect to mobile interface if we are on mobile and no_redirect is not set
if (!shouldSkipRedirect && (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('Android'))) {
  const redirectUrl = document.querySelector('meta[name=redirect-url]')?.getAttribute('content');
  if (redirectUrl) {
    redirectTo(redirectUrl);
  }
}

// Display the splash-screen
const splash = new SplashScreen();
splash.begin();

const girafeApp = new GeoGirafeApp();
girafeApp.isReady().then(() => {
  // Remove the splash-screen
  splash.end();
  girafeApp.context.onBoardingManager.start();
});
