@echo off

set APPDIR="public"
set OUTPUTDIR="%APPDIR%\Mock"
if not exist %OUTPUTDIR% mkdir %OUTPUTDIR%

if "%1"=="c2c" (
    echo "Preparing environment CAMPTOCAMP..."
    copy demo\config.c2c.json %APPDIR%\config.json /Y
    goto :end
)


if "%1"=="experimental" (
    echo "Preparing environment EXPERIMENTAL..."
    copy demo\config.experimental.json %APPDIR%\config.json /Y
    goto :end
)


if "%1"=="cartolacote" (
    echo "Preparing environment CARTOLACOTE..."
    copy demo\config.cartolacote.json %APPDIR%\config.json /Y
    goto :end
)

if "%1"=="cartoriviera" (
    echo "Preparing environment CARTORIVIERA..."
    copy demo\config.cartoriviera.json %APPDIR%\config.json /Y
    copy demo\config.cartoriviera.mobile.json %APPDIR%\config.mobile.json /Y
    goto :end
)

if "%1"=="cjl" (
    echo "Preparing environment CARTOJURALEMAN..."
    copy demo\config.cjl.json %APPDIR%\config.json /Y
    goto :end
)

if "%1"=="geogr" (
    echo "Preparing environment GEOGR..."
    copy demo\config.geogr.json %APPDIR%\config.json /Y
    goto :end
)

if "%1"=="jura" (
    echo "Preparing environment JURA..."
    copy demo\config.jura.json %APPDIR%\config.json /Y
    goto :end
)

if "%1"=="lausanne" (
    echo "Preparing environment LAUSANNE..."
    copy demo\config.lausanne.json %APPDIR%\config.json /Y
    curl "https://map.lausanne.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.lausanne.ch/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    goto :end
)

if "%1"=="lie" (
    echo "Preparing environment LIE..."
    copy demo\config.lie.json %APPDIR%\config.json /Y
    curl "https://map.geo.llv.li/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.llv.li/static/dummy/de.json" --output %OUTPUTDIR%\de.json
    goto :end
)

if "%1"=="mapbs" (
    echo "Preparing environment MAPBS..."
    copy demo\config.mapbs.json %APPDIR%\config.json /Y
    copy demo\config.mapbs.mobile.json %APPDIR%\config.mobile.json /Y
    curl "https://map.geo.bs.ch/static/dummy/de.json" --output %OUTPUTDIR%\de.json
    curl "https://map.geo.bs.ch/static/dummy/en.json" --output %OUTPUTDIR%\en.json
    curl "https://map.geo.bs.ch/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    goto :end
)

if "%1"=="mapnv" (
    echo "Preparing environment MAPNV..."
    copy demo\config.mapnv.json %APPDIR%\config.json /Y
    curl "https://mapnv.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://mapnv.ch/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    goto :end
)

if "%1"=="schwyz" (
    echo "Preparing environment SCHWYZ..."
    copy demo\config.schwyz.json %APPDIR%\config.json /Y
    goto :end
)

if "%1"=="sigip" (
    echo "Preparing environment SIGIP..."
    copy demo\config.sigip.json %APPDIR%\config.json /Y
    goto :end
)

if "%1"=="sitn" (
    echo "Preparing environment SITN..."
    copy demo\config.sitn.json %APPDIR%\config.json /Y
    copy demo\config.sitn.mobile.json %APPDIR%\config.mobile.json /Y
    goto :end
)

if "%1"=="ticino" (
    echo "Preparing environment TICINO..."
    copy demo\config.ticino.json %APPDIR%\config.json /Y
    curl "https://map.geo.ti.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.ti.ch/static/dummy/it.json" --output %OUTPUTDIR%\it.json
    goto :end
)

echo "Usage: ./configure-demo-win <environment>"
echo "Possible environments: ['c2c', 'experimental', 'cartolacote', 'cartoriviera', 'cjl', 'geogr', 'jura', 'lausanne', 'lie', 'mapbs', 'mapnv', 'schwyz', 'sigip', 'sitn', 'ticino']"
echo "Usage example: ./configure-demo-win mapbs"
echo "Usage example with npm: npm run configure-demo-win mapbs"

:end
