#!/bin/bash

# Copy HTML Templates
cd src
cp --parents -R components/**/*.html static/ 
cd .. 

# Copy CSS styles for Libraries (are not included in css bundle)
mkdir -p src/static/lib/
cp node_modules/ol/ol.css src/static/lib/
cp node_modules/@fortawesome/fontawesome-free/css/all.min.css src/static/lib/
#cp node_modules/@fortawesome/fontawesome-free/js/all.min.js src/static/lib/
cp -r node_modules/@fortawesome/fontawesome-free/webfonts src/static/
