set -ex
APPDIR="public"
if [ -n "$2" ];
then
    APPDIR="$2"
fi

MOCKDIR="$APPDIR/Mock"
mkdir -p "$MOCKDIR"

if [ "$1" = 'c2c' ];
then
    echo "Preparing environment CAMPTOCAMP..."
    cp demo/config.$1.json $APPDIR/config.json
    curl "https://geomapfish-demo-2-8.camptocamp.com/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://geomapfish-demo-2-8.camptocamp.com/static/dummy/de.json" --silent --output $MOCKDIR/de.json
    curl "https://geomapfish-demo-2-8.camptocamp.com/static/dummy/en.json" --silent --output $MOCKDIR/en.json
    curl "https://geomapfish-demo-2-8.camptocamp.com/static/dummy/fr.json" --silent --output $MOCKDIR/fr.json
elif [ "$1" = 'experimental' ];
then
    echo "Preparing environment EXPERIMENTAL..."
    cp demo/config.$1.json $APPDIR/config.json
    curl "https://geomapfish-demo-2-9.camptocamp.com/themes?background=background&interface=experimental" --silent --output $MOCKDIR/themes.json
    curl "https://geomapfish-demo-2-9.camptocamp.com/static/dummy/de.json" --silent --output $MOCKDIR/de.json
    curl "https://geomapfish-demo-2-9.camptocamp.com/static/dummy/en.json" --silent --output $MOCKDIR/en.json
    curl "https://geomapfish-demo-2-9.camptocamp.com/static/dummy/fr.json" --silent --output $MOCKDIR/fr.json
elif [ "$1" = 'cartolacote' ];
then
    echo "Preparing environment CARTOLACOTE..."
    cp demo/config.$1.json $APPDIR/config.json

elif [ "$1" = 'cartoriviera' ];
then
    echo "Preparing environment CARTORIVIERA..."
    cp demo/config.$1.json $APPDIR/config.json
    cp demo/config.$1.mobile.json $APPDIR/config.mobile.json
    echo "Cannot create Mock objects for cartoriviera, the following commands are blocked when executed from AWS or GitLab Pipeline"

elif [ "$1" = 'cjl' ];
then
    echo "Preparing environment CARTOJURALEMAN..."
    cp demo/config.$1.json $APPDIR/config.json

elif [ "$1" = 'geogr' ];
then
    echo "Preparing environment GEOGR..."
    cp demo/config.$1.json $APPDIR/config.json
    curl "https://edit.geo.gr.ch/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://edit.geo.gr.ch/static-ngeo/build/de.json" --silent --output $MOCKDIR/de.json

elif [ "$1" = 'lausanne' ];
then
    echo "Preparing environment LAUSANNE..."
    cp demo/config.$1.json $APPDIR/config.json
    curl "https://map.lausanne.ch/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://map.lausanne.ch/static/dummy/fr.json" --silent --output $MOCKDIR/fr.json

elif [ "$1" = 'lie' ];
then
    echo "Preparing environment LIE..."
    cp demo/config.$1.json $APPDIR/config.json
    curl "https://map.geo.llv.li/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://map.geo.llv.li/static/dummy/de.json" --silent --output $MOCKDIR/de.json

elif [ "$1" = 'mapbs' ];
then
    echo "Preparing environment MAPBS..."
    cp demo/config.$1.json $APPDIR/config.json
    cp demo/config.$1.mobile.json $APPDIR/config.mobile.json
    curl "https://map.geo.bs.ch/static/dummy/de.json" --silent --output $MOCKDIR/de.json
    curl "https://map.geo.bs.ch/static/dummy/en.json" --silent --output $MOCKDIR/en.json
    curl "https://map.geo.bs.ch/static/dummy/fr.json" --silent --output $MOCKDIR/fr.json

elif [ "$1" = 'mapnv' ];
then
    echo "Preparing environment MAPNV..."
    cp demo/config.$1.json $APPDIR/config.json
    curl "https://mapnv.ch/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://mapnv.ch/static/dummy/fr.json" --silent --output $MOCKDIR/fr.json

elif [ "$1" = 'schwyz' ];
then
    echo "Preparing environment SCHWYZ..."
    cp demo/config.$1.json $APPDIR/config.json
    curl "https://map.geo.sz.ch/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://map.geo.sz.ch/static-ngeo/build/de.json" --silent --output $MOCKDIR/de.json

elif [ "$1" = 'sigip' ];
then
    echo "Preparing environment SIGIP..."
    cp demo/config.$1.json $APPDIR/config.json

elif [ "$1" = 'sitn' ];
then
    echo "Preparing environment SITN..."
    cp demo/config.$1.json $APPDIR/config.json
    cp demo/config.$1.mobile.json $APPDIR/config.mobile.json

elif [ "$1" = 'ticino' ];
then
    echo "Preparing environment TICINO..."
    cp demo/config.$1.json $APPDIR/config.json
    curl "https://map.geo.ti.ch/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://map.geo.ti.ch/static/dummy/it.json" --silent --output $MOCKDIR/it.json

else
    echo "Usage: ./configure-demo <environment>"
    echo "Possible environments: ['c2c', 'experimental', 'cartolacote', 'cartoriviera', 'cjl', 'geogr', 'lausanne', 'lie', 'mapbs', 'mapnv', 'schwyz', 'sigip', 'sitn', 'ticino']"
    echo "Usage example: ./configure-demo mapbs"
    echo "Usage example with npm: npm run configure-demo mapbs"

fi
