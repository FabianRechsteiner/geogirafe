# Initialize Cordova Project
cordova create GeoGirafe dev.geomapfish.geogirafe GeoGirafe
cd GeoGirafe
cordova platform add android
cordova requirements

# Copy sources of GeoGirafe to Cordova Project
# and add the needed configuration
rm -Rf www/*
rm config.xml
cp -R /geogirafe/dist/app/* www/
cp /geogirafe/buildtools/cordova/config.xml .
cp /geogirafe/buildtools/cordova/girafe.png .
sed -i 's#</body>#  <script src="cordova.js"></script>\n  </body>#g' www/index.html

# Build the APK
cordova build android

# Copy the APK to output
mkdir -p /geogirafe/dist/apk
cp /src/GeoGirafe/platforms/android/app/build/outputs/apk/debug/app-debug.apk /geogirafe/dist/apk/geogirafe.apk
