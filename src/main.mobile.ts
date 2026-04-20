// SPDX-License-Identifier: Apache-2.0
import { redirectTo, SplashScreen } from './main.tools';
import GeoGirafeAppMobile from './tools/app/geogirafeapp-mobile';

const shouldSkipRedirect = new URLSearchParams(globalThis.location.search).has('no_redirect');

// Redirect to desktop interface if we are NOT on mobile and no_redirect is not set
if (!shouldSkipRedirect && !navigator.userAgent.includes('iPhone') && !navigator.userAgent.includes('Android')) {
  const redirectUrl = document.querySelector('meta[name=redirect-url]')?.getAttribute('content');
  if (redirectUrl) {
    redirectTo(redirectUrl);
  }
}

// Display the splash-screen
const splash = new SplashScreen();
splash.begin();

const girafeApp = new GeoGirafeAppMobile();
girafeApp.isReady().then(() => {
  // Remove the splash-screen
  splash.end();
});
