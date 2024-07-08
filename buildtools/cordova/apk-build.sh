PREFIX="/geogirafe"
if [ "$1" = 'ci' ];
then
  PREFIX=".."
fi

# Initialize Cordova Project
cordova create GeoGirafe dev.geomapfish.geogirafe GeoGirafe
cd GeoGirafe
cordova platform add android
# TODO REG: Perhaps the following line could be necessary for iOS ?
# cordova plugin add cordova-plugin-indexeddb
# This plugin allow to detect online and offline mode, 
# because the standard addEventListener('offline') does not work in the app
cordova plugin add cordova-plugin-network-information
cordova requirements

# Copy sources of GeoGirafe to Cordova Project
# and add the needed configuration
rm -Rf www/*
rm config.xml
cp -R ${PREFIX}/dist/app/* www/
rm -Rf www/assets/*.js.map
cp ${PREFIX}/buildtools/cordova/config.xml .
cp ${PREFIX}/buildtools/cordova/app-icon.png .
sed -i 's#</body>#  <script src="cordova.js"></script>\n  </body>#g' www/mobile.html
mkdir -p ${PREFIX}/dist/apk

if [ "$1" = 'ci' ];
then
  # Build for CI
  chmod +x ${PREFIX}/buildtools/configure-demo.sh 
  # MapBS
  cd .. && buildtools/configure-demo.sh "mapbs" "GeoGirafe/www" && cd GeoGirafe
  cordova build android
  cp platforms/android/app/build/outputs/apk/debug/app-debug.apk ${PREFIX}/dist/apk/geogirafe-mapbs.apk
  # SITN
  cd .. && buildtools/configure-demo.sh "sitn" "GeoGirafe/www" && cd GeoGirafe
  cordova build android
  cp platforms/android/app/build/outputs/apk/debug/app-debug.apk ${PREFIX}/dist/apk/geogirafe-sitn.apk
else
  # Build for local
  cordova build android
  cp platforms/android/app/build/outputs/apk/debug/app-debug.apk ${PREFIX}/dist/apk/geogirafe.apk
fi
