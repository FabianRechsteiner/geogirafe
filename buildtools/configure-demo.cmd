@echo off

set OUTPUTDIR="src\static\Mock"
if not exist %OUTPUTDIR% mkdir %OUTPUTDIR%

if "%1"=="mapbs" (
    echo "Preparing environment MAPBS..."
    copy demo\config.mapbs.json src\static\config.json /Y
    curl "https://map.geo.bs.ch/themes?background=background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    goto :end
)

if "%1"=="sitn" (
    echo "Preparing environment SITN..."
    copy demo\config.sitn.json src\static\config.json /Y
    curl "https://sitn.ne.ch/themes?background=desktop_background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    curl "https://sitn.ne.ch/printproxy/capabilities.json" --silent --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="cartoriviera" (
    echo "Preparing environment Cartoriviera..."
    copy demo\config.cartoriviera.json src\static\config.json /Y
    curl "https://map.cartoriviera.ch/themes?background=background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    curl "https://map.cartoriviera.ch/printproxy/capabilities.json" --silent --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="geogr" (
    echo "Preparing environment GEOGR..."
    copy demo\config.geogr.json src\static\config.json /Y
    curl "https://edit.geo.gr.ch/themes?background=background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    curl "https://edit.geo.gr.ch/static-ngeo/build/de.json" --silent --output %OUTPUTDIR%\de.json
    curl "https://edit.geo.gr.ch/printproxy/capabilities.json" --silent --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="lie" (
    echo "Preparing environment LIE..."
    copy demo\config.lie.json src\static\config.json /Y
    curl "https://map.geo.llv.li/themes?background=background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.llv.li/static/X/de.json" --silent --output %OUTPUTDIR%\de.json
    curl "https://map.geo.llv.li/printproxy/capabilities.json" --silent --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="sigip" (
    echo "Preparing environment SIGIP..."
    copy demo\config.sigip.json src\static\config.json /Y
    curl "https://www.sigip.ch/themes?background=background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    curl "https://www.sigip.ch/static/dummy/fr.json" --silent --output %OUTPUTDIR%\fr.json
    curl "https://www.sigip.ch/printproxy/capabilities.json" --silent --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="ticino" (
    echo "Preparing environment TICINO..."
    copy demo\config.ticino.json src\static\config.json /Y
    curl "https://map.geo.ti.ch/themes?background=background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.ti.ch/static/dummy/en.json" --silent --output %OUTPUTDIR%\en.json
    curl "https://map.geo.ti.ch/printproxy/capabilities.json" --silent --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="lausanne" (
    echo "Preparing environment LAUSANNE..."
    copy demo\config.lausanne.json src\static\config.json /Y
    curl "https://map.lausanne.ch/themes?background=background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    curl "https://map.lausanne.ch/static/dummy/fr.json" --silent --output %OUTPUTDIR%\fr.json
    curl "https://map.lausanne.ch/printproxy/capabilities.json" --silent --output %OUTPUTDIR%\capabilities.json
    goto :end
)

if "%1"=="mapnv" (
    echo "Preparing environment MAPNV..."
    copy demo\config.mapnv.json src\static\config.json /Y
    curl "https://mapnv.ch/themes?background=background&interface=desktop" --silent --output %OUTPUTDIR%\themes.json
    curl "https://mapnv.ch/static/dummy/fr.json" --silent --output %OUTPUTDIR%\fr.json
    curl "https://mapnv.ch/printproxy/capabilities.json" --silent --output %OUTPUTDIR%\capabilities.json
    goto :end
)

echo "Usage: ./configure-demo-win <environment>"
echo "Possible environments: ['mapbs', 'sitn', 'cartoriviera', 'geogr', 'lie', 'sigip', 'ticino', 'lausanne', 'mapnv']"
echo "Usage example: ./configure-demo-win mapbs"
echo "Usage example with npm: npm run configure-demo-win mapbs"

:end
