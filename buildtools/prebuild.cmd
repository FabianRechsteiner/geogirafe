@echo off
REM Copy HTML Templates
cd src
xcopy components\*.html static\components\ /S /Y
cd .. 

REM Copy CSS styles for Libraries (are not included in css bundle)
if not exist src\static\lib mkdir src\static\lib
xcopy node_modules\ol\ol.css src\static\components\map\ /Y
