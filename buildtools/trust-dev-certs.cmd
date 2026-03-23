:: SPDX-License-Identifier: Apache-2.0
@echo off
setlocal

REM Where to generate the certificates
IF "%~1"=="" (
  set "TARGET_DIR=buildtools\certs"
) ELSE (
  set "TARGET_DIR=%~1"
)
pushd "%TARGET_DIR%"

REM Copy default certificates to the right location
copy "default\*.pem" . /Y

REM Add root certificate to trusted store (for the current user)
certutil -user -addstore root "rootCA.pem"
echo Certificate was added successfully.
echo Please restart your browser to take it into account.

popd
