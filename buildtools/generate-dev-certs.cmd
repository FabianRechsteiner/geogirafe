@echo off
setlocal

REM This script should be run as root
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo Need admin privileges to trust the dev certificate...
  powershell -Command "Start-Process cmd -ArgumentList '/c cd /d %CD% && %~fnx0' -Verb RunAs"
  exit /b 1
)

REM Ensure that Docker est installed
where docker >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo Docker not found. Please install it first (https://www.docker.com/products/docker-desktop)
  exit /b 1
)

REM Where to generate the certificates
IF "%~1"=="" (
  set "TARGET_DIR=buildtools\certs"
) ELSE (
  set "TARGET_DIR=%~1"
)

REM Create directories
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
pushd "%TARGET_DIR%"

REM Generate certificates
docker run --rm -v %CD%:/root/.local/share/mkcert alpine/mkcert -install
docker run --rm -v %CD%:/root/.local/share/mkcert alpine/mkcert -cert-file /root/.local/share/mkcert/app.localhost.cert.pem -key-file /root/.local/share/mkcert/app.localhost.key.pem app.localhost localhost 127.0.0.1

REM Add root certificate to trusted store
certutil -addstore root "rootCA.pem"
echo Certificate was added successfully.

popd
pause
