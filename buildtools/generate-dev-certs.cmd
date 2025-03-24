@echo off

REM This script should be run as root
NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo Need admin privileges to trust the dev certificate...
  powershell -Command "Start-Process cmd -ArgumentList '/c cd /d %CD% && %~fnx0' -Verb RunAs"
  exit /b
)

REM Create directories
cd buildtools
if not exist certs mkdir certs
cd certs

REM Generate certificates
docker run --rm -v .:/root/.local/share/mkcert alpine/mkcert -install
docker run --rm -v .:/root/.local/share/mkcert alpine/mkcert -cert-file /root/.local/share/mkcert/app.localhost.cert.pem -key-file /root/.local/share/mkcert/app.localhost.key.pem app.localhost localhost 127.0.0.1

REM Add root certificate to trusted store
certutil -addstore root "rootCA.pem"
echo Certificate was added successfully.


pause
