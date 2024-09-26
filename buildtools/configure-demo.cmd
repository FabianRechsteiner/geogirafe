@echo off

set APPDIR="public"
set OUTPUTDIR="%APPDIR%\Mock"
if not exist %OUTPUTDIR% mkdir %OUTPUTDIR%

if "%1"=="c2c" (
    echo "Preparing environment CAMPTOCAMP..."
    copy demo\config.c2c.json %APPDIR%\config.json /Y
    copy demo\de.json %APPDIR%\de.json /Y
    copy demo\en.json %APPDIR%\en.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    curl "https://geomapfish-demo-2-8.camptocamp.com/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://geomapfish-demo-2-8.camptocamp.com/static/dummy/de.json" --output %OUTPUTDIR%\de.json
    curl "https://geomapfish-demo-2-8.camptocamp.com/static/dummy/en.json" --output %OUTPUTDIR%\en.json
    curl "https://geomapfish-demo-2-8.camptocamp.com/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    curl "https://geomapfish-demo-2-8.camptocamp.com/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)


if "%1"=="experimental" (
    echo "Preparing environment EXPERIMENTAL..."
    copy demo\config.experimental.json %APPDIR%\config.json /Y
    copy demo\de.json %APPDIR%\de.json /Y
    copy demo\en.json %APPDIR%\en.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    curl "https://geomapfish-demo-2-9.camptocamp.com/themes?background=background&interface=experimental" --output %OUTPUTDIR%\themes.json
    curl "https://geomapfish-demo-2-9.camptocamp.com/static/dummy/de.json" --output %OUTPUTDIR%\de.json
    curl "https://geomapfish-demo-2-9.camptocamp.com/static/dummy/en.json" --output %OUTPUTDIR%\en.json
    curl "https://geomapfish-demo-2-9.camptocamp.com/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    curl "https://geomapfish-demo-2-9.camptocamp.com/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)


if "%1"=="cartolacote" (
    echo "Preparing environment CARTOLACOTE..."
    copy demo\config.cartolacote.json %APPDIR%\config.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    goto :end
)

if "%1"=="cartoriviera" (
    echo "Preparing environment CARTORIVIERA..."
    copy demo\config.cartoriviera.json %APPDIR%\config.json /Y
    copy demo\config.cartoriviera.mobile.json %APPDIR%\config.mobile.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    goto :end
)

if "%1"=="cjl" (
    echo "Preparing environment CARTOJURALEMAN..."
    copy demo\config.cjl.json %APPDIR%\config.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    curl "https://map.cjl.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.cjl.ch/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    curl "https://map.cjl.ch/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="geogr" (
    echo "Preparing environment GEOGR..."
    copy demo\config.geogr.json %APPDIR%\config.json /Y
    copy demo\de.json %APPDIR%\de.json /Y
    curl "https://edit.geo.gr.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://edit.geo.gr.ch/static-ngeo/build/de.json" --output %OUTPUTDIR%\de.json
    curl "https://edit.geo.gr.ch/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="lausanne" (
    echo "Preparing environment LAUSANNE..."
    copy demo\config.lausanne.json %APPDIR%\config.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    curl "https://map.lausanne.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.lausanne.ch/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    curl "https://map.lausanne.ch/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="lie" (
    echo "Preparing environment LIE..."
    copy demo\config.lie.json %APPDIR%\config.json /Y
    copy demo\de.json %APPDIR%\de.json /Y
    curl "https://map.geo.llv.li/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.llv.li/static/dummy/de.json" --output %OUTPUTDIR%\de.json
    curl "https://map.geo.llv.li/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="mapbs" (
    echo "Preparing environment MAPBS..."
    copy demo\config.mapbs.json %APPDIR%\config.json /Y
    copy demo\config.mapbs.mobile.json %APPDIR%\config.mobile.json /Y
    copy demo\de.json %APPDIR%\de.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    copy demo\en.json %APPDIR%\en.json /Y
    curl "https://map.geo.bs.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.bs.ch/static/dummy/de.json" --output %OUTPUTDIR%\de.json
    curl "https://map.geo.bs.ch/static/dummy/en.json" --output %OUTPUTDIR%\en.json
    curl "https://map.geo.bs.ch/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    curl "https://map.geo.bs.ch/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="mapnv" (
    echo "Preparing environment MAPNV..."
    copy demo\config.mapnv.json %APPDIR%\config.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    curl "https://mapnv.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://mapnv.ch/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
    curl "https://mapnv.ch/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="schwyz" (
    echo "Preparing environment SCHWYZ..."
    copy demo\config.schwyz.json %APPDIR%\config.json /Y
    copy demo\de.json %APPDIR%\de.json /Y
    curl "https://map.geo.sz.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.sz.ch/static-ngeo/build/de.json" --output %OUTPUTDIR%\de.json
    curl "https://map.geo.sz.ch/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="sigip" (
    echo "Preparing environment SIGIP..."
    copy demo\config.sigip.json %APPDIR%\config.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    goto :end
)

if "%1"=="sitn" (
    echo "Preparing environment SITN..."
    copy demo\config.sitn.json %APPDIR%\config.json /Y
    copy demo\config.sitn.mobile.json %APPDIR%\config.mobile.json /Y
    copy demo\fr.json %APPDIR%\fr.json /Y
    goto :end
)

if "%1"=="ticino" (
    echo "Preparing environment TICINO..."
    copy demo\config.ticino.json %APPDIR%\config.json /Y
    copy demo\it.json %APPDIR%\it.json /Y
    curl "https://map.geo.ti.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.ti.ch/static/dummy/it.json" --output %OUTPUTDIR%\it.json
    curl "https://map.geo.ti.ch/printproxy/capabilities.json" --output %OUTPUTDIR%\capabilities.json
    goto :end
)

echo "Usage: ./configure-demo-win <environment>"
echo "Possible environments: ['c2c', 'experimental', 'cartolacote', 'cartoriviera', 'cjl', 'geogr', 'lausanne', 'lie', 'mapbs', 'mapnv', 'schwyz', 'sigip', 'sitn', 'ticino']"
echo "Usage example: ./configure-demo-win mapbs"
echo "Usage example with npm: npm run configure-demo-win mapbs"

:end
