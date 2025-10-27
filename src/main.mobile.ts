import { redirectTo, SplashScreen } from './main.tools';
import GeoGirafeAppMobile from './tools/app/geogirafeapp-mobile';

// Redirect to desktop interface if we are NOT on mobile
if (!navigator.userAgent.includes('iPhone') && !navigator.userAgent.includes('Android')) {
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
