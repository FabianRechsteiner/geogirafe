@echo off
setlocal

REM Ensure that Docker est installed
where docker >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo Docker not found. Please install it first [https://www.docker.com/products/docker-desktop]
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
echo Certificate was created successfully.

REM Add root certificate to trusted store (for the current user)
certutil -user -addstore root "rootCA.pem"
echo Certificate was added successfully.
echo Please restart your browser to take it into account.

popd
