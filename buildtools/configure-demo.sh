OUTPUTDIR="src/static/Mock"

if [ "$1" = 'sitn' ];
then
    echo "Preparing environment SITN..."
    cp demo/config.sitn.json src/static/config.json
    curl "https://sitn.ne.ch/themes?background=desktop_background&interface=desktop" --silent --output $OUTPUTDIR/themes.json
    curl "https://sitn.ne.ch/printproxy/capabilities.json" --silent --output $OUTPUTDIR/capabilities.json

elif [ "$1" = 'geogr' ];
then
    echo "Preparing environment GEOGR..."
    cp demo/config.geogr.json src/static/config.json
    curl "https://edit.geo.gr.ch/themes?background=background&interface=desktop" --silent --output $OUTPUTDIR/themes.json
    curl "https://edit.geo.gr.ch/static-ngeo/build/de.json" --silent --output $OUTPUTDIR/de.json
    curl "https://edit.geo.gr.ch/printproxy/capabilities.json" --silent --output $OUTPUTDIR/capabilities.json

fi

