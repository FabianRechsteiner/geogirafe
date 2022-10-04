#!/bin/bash

# Copy HTML Templates
cd src
cp --parents -R components/**/*.html static/ 
cd .. 

# Copy CSS styles for Libraries (are not included in css bundle)
mkdir -p src/static/lib/
cp node_modules/ol/ol.css src/static/lib/
