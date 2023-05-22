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

echo "Usage: ./configure-demo <environment>"
echo "Possible environments: ['mapbs', 'sitn', 'geogr', 'lie']"
echo "Usage example: ./configure-demo mapbs"
echo "Usage example with npm: npm run configure-demo mapbs"

:end

