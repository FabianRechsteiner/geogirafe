set -ex
APPDIR="public"
if [ -n "$2" ];
then
    APPDIR="$2"
fi

MOCKDIR="$APPDIR/Mock"
mkdir -p "$MOCKDIR"

name=$1
echo "You can get help with the argument help"
if [ "$name" = 'help' ];
then
    echo "Usage: ./configure-demo <environment>"
    echo "Possible environments: ['c2c', 'experimental', 'cartolacote', 'cartoriviera', 'cjl', 'geogr', 'georama', 'jura', 'lausanne', 'lie', 'mapbs', 'mapnv', 'schwyz', 'sigip', 'sitn', 'ticino']"
    echo "Usage example: ./configure-demo mapbs"
    echo "Usage example with npm: npm run configure-demo mapbs"
    exit
fi

echo "Preparing environment ${name^^}..."
cp "demo/config.$name.json" "$APPDIR/config.json"
if [ -f "demo/config.$name.mobile.json" ]; then
    cp "demo/config.$name.mobile.json" "$APPDIR/config.mobile.json"
fi

# Special cases for Mocking themes and translations (still CORS errors from the backend)
if [ "$name" = 'lie' ];
then
    curl "https://map.geo.llv.li/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://map.geo.llv.li/static/dummy/de.json" --silent --output $MOCKDIR/de.json

elif [ "$name" = 'mapnv' ];
then
    curl "https://mapnv.ch/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://mapnv.ch/static/dummy/fr.json" --silent --output $MOCKDIR/fr.json

elif [ "$name" = 'ticino' ];
then
    curl "https://map.geo.ti.ch/themes?background=background&interface=desktop" --silent --output $MOCKDIR/themes.json
    curl "https://map.geo.ti.ch/static/dummy/it.json" --silent --output $MOCKDIR/it.json

fi
