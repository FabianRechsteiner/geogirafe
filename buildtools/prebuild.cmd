@echo off
REM Copy HTML Templates, CSS and images
cd src
xcopy components\*.png static\components\ /S /Y
xcopy components\*.webp static\components\ /S /Y
cd .. 

REM Copy CSS styles for Libraries (are not included in css bundle)
if not exist src\static\lib mkdir src\static\lib

if not exist src\static\lib\openlayers mkdir src\static\lib\openlayers
xcopy node_modules\ol\ol.css src\static\lib\openlayers\ /Y

if not exist src\static\lib\vanilla-picker mkdir src\static\lib\vanilla-picker
xcopy node_modules\vanilla-picker\dist\vanilla-picker.csp.css src\static\lib\vanilla-picker\ /Y

if not exist src\static\lib\gridjs mkdir src\static\lib\gridjs
xcopy node_modules\gridjs\dist\theme\mermaid.min.css src\static\lib\gridjs\ /Y

if not exist src\static\lib\tippy.js mkdir src\static\lib\tippy.js
if exist src\static\lib\tippy.js\tippy.min.css del /F src\static\lib\tippy.js\tippy.min.css
for /F %%f in ('dir /s/b node_modules\tippy.js\*.css') do type %%f>>src\static\lib\tippy.js\tippy.min.css

if not exist src\static\lib\cesium mkdir src\static\lib\cesium
xcopy node_modules\cesium\Build\Cesium\* src\static\lib\cesium\ /S /Y
