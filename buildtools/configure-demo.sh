OUTPUTDIR="src/static/Mock"
mkdir -p "$OUTPUTDIR"

if [ "$1" = 'mapbs' ];
then
    echo "Preparing environment MAPBS..."
    cp demo/config.mapbs.json src/static/config.json
    curl "https://map.geo.bs.ch/themes?background=background&interface=desktop" --silent --output $OUTPUTDIR/themes.json

elif [ "$1" = 'sitn' ];
then
    echo "Preparing environment SITN..."
    cp demo/config.sitn.json src/static/config.json
    curl "https://sitn.ne.ch/themes?background=desktop_background&interface=desktop" --silent --output $OUTPUTDIR/themes.json
    curl "https://sitn.ne.ch/printproxy/capabilities.json" --silent --output $OUTPUTDIR/capabilities.json

elif [ "$1" = 'cartoriviera' ];
then
    echo "Preparing environment Cartoriviera..."
    cp demo/config.cartoriviera.json src/static/config.json
    curl "https://map.cartoriviera.ch/themes?background=background&interface=desktop" --silent --output $OUTPUTDIR/themes.json
    curl "https://map.cartoriviera.ch/printproxy/capabilities.json" --silent --output $OUTPUTDIR/capabilities.json

elif [ "$1" = 'geogr' ];
then
    echo "Preparing environment GEOGR..."
    cp demo/config.geogr.json src/static/config.json
    curl "https://edit.geo.gr.ch/themes?background=background&interface=desktop" --silent --output $OUTPUTDIR/themes.json
    curl "https://edit.geo.gr.ch/static-ngeo/build/de.json" --silent --output $OUTPUTDIR/de.json
    curl "https://edit.geo.gr.ch/printproxy/capabilities.json" --silent --output $OUTPUTDIR/capabilities.json

elif [ "$1" = 'lie' ];
then
    echo "Preparing environment LIE..."
    cp demo/config.lie.json src/static/config.json
    curl "https://map.geo.llv.li/themes?background=background&interface=desktop" --silent --output $OUTPUTDIR/themes.json
    curl "https://map.geo.llv.li/static/dummy/de.json" --silent --output $OUTPUTDIR/de.json
    curl "https://map.geo.llv.li/printproxy/capabilities.json" --silent --output $OUTPUTDIR/capabilities.json

elif [ "$1" = 'sigip' ];
then
    echo "Preparing environment SIGIP..."
    cp demo/config.sigip.json src/static/config.json
    curl "https://www.sigip.ch/themes?background=background&interface=desktop" --silent --output $OUTPUTDIR/themes.json
    curl "https://www.sigip.ch/static/dummy/fr.json" --silent --output $OUTPUTDIR/fr.json
    curl "https://www.sigip.ch/printproxy/capabilities.json" --silent --output $OUTPUTDIR/capabilities.json

elif [ "$1" = 'ticino' ];
then
    echo "Preparing environment TICINO..."
    cp demo/config.ticino.json src/static/config.json
    curl "https://map.geo.ti.ch/themes?background=background&interface=desktop" --silent --output $OUTPUTDIR/themes.json
    curl "https://map.geo.ti.ch/static/dummy/en.json" --silent --output $OUTPUTDIR/en.json
    curl "https://map.geo.ti.ch/printproxy/capabilities.json" --silent --output $OUTPUTDIR/capabilities.json

else
    echo "Usage: ./configure-demo <environment>"
    echo "Possible environments: ['mapbs', 'sitn', 'cartoriviera', 'geogr', 'lie', 'sigip', 'ticino']"
    echo "Usage example: ./configure-demo mapbs"
    echo "Usage example with npm: npm run configure-demo mapbs"

fi
