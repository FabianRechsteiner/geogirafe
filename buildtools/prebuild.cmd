@echo off
REM Copy HTML Templates
cd src
xcopy components\*.html static\components\ /S /Y
xcopy components\*.css static\components\ /S /Y
cd .. 

REM Copy CSS styles for Libraries (are not included in css bundle)
if not exist src\static\lib mkdir src\static\lib

if not exist src\static\lib\openlayers mkdir src\static\lib\openlayers
xcopy node_modules\ol\ol.css src\static\lib\openlayers\ /Y

if not exist src\static\lib\lib\vanilla-picker mkdir src\static\lib\vanilla-picker
xcopy node_modules\vanilla-picker\dist\vanilla-picker.csp.css src\static\lib\vanilla-picker\ /Y
