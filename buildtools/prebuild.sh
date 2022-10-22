#!/bin/bash

# Copy HTML Templates
cd src
rm -Rf static/components
cp --parents -R components/**/*.html static/
cp --parents -R components/**/**/*.html static/
cp --parents -R components/**/*.css static/
cp --parents -R components/**/**/*.css static/
cd .. 

# Copy CSS styles for Libraries (are not included in css bundle)
mkdir -p src/static/lib/

mkdir -p src/static/lib/openlayers/
cp node_modules/ol/ol.css src/static/lib/openlayers/

mkdir -p src/static/lib/vanilla-picker/
cp node_modules/vanilla-picker/dist/vanilla-picker.csp.css src/static/lib/vanilla-picker/

mkdir -p src/static/lib/tippy.js/
rm -f src/static/lib/tippy.js/tippy.min.css
find node_modules/tippy.js/ -name *.css -exec cat {} >> src/static/lib/tippy.js/tippy.min.css \;
