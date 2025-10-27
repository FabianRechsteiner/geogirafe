import { redirectTo, SplashScreen } from './main.tools';
import GeoGirafeApp from './tools/app/geogirafeapp';

// Redirect to mobile interface if we are on mobile
if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('Android')) {
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
});
