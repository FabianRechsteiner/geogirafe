@echo off

set "APPDIR=public"
set "OUTPUTDIR=%APPDIR%\Mock"
if not exist %OUTPUTDIR% mkdir %OUTPUTDIR%

set "name=%1"
echo You can get help with the argument help
if "%name%"=="help" (
    echo "Usage: ./configure-demo-win <environment>"
    echo "Possible environments: ['c2c', 'experimental', 'cartolacote', 'cartoriviera', 'cjl', 'geocommunes', 'geogr', 'georama', 'jura', 'lausanne', 'lie', 'mapbs', 'mapnv', 'schwyz', 'sigip', 'sitn', 'ticino']"
    echo "Usage example: ./configure-demo-win mapbs"
    echo "Usage example with npm: npm run configure-demo-win mapbs"
    exit
)

echo Preparing environment for %name%...
copy /Y "demo\config.%name%.json" "%APPDIR%\config.json"
if exist "demo\config.%name%.mobile.json" (
    copy /Y "demo\config.%name%.mobile.json" "%APPDIR%\config.mobile.json"
)
if exist "demo\config.%name%.api.json" (
    copy /Y "demo\config.%name%.api.json" "%APPDIR%\config.api.json"
)

if "%name%"=="lie" (
    curl "https://map.geo.llv.li/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.llv.li/static/dummy/de.json" --output %OUTPUTDIR%\de.json
) else if "%name%"=="mapnv" (
    curl "https://mapnv.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://mapnv.ch/static/dummy/fr.json" --output %OUTPUTDIR%\fr.json
) else if "%name%"=="ticino" (
    curl "https://map.geo.ti.ch/themes?background=background&interface=desktop" --output %OUTPUTDIR%\themes.json
    curl "https://map.geo.ti.ch/static/dummy/it.json" --output %OUTPUTDIR%\it.json
)
