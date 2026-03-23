# SPDX-License-Identifier: Apache-2.0
set +x

# Ensure that certutil is installed
if ! command -v certutil &> /dev/null; then
    echo "certutil not found. Please install it first (e.g. libnss3-tools on Ubuntu)"
    exit 1
fi

# Ensure that Docker est installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Please install it first (https://docs.docker.com/get-docker/)"
    exit 1
fi

# Ask for sudo rights, it will be needed to trust the certificate
sudo -v

# Create directories
TARGET_DIR="${1:-buildtools/certs}"
mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

# Generate certificates
echo Generating development certificates
docker run --rm -v "$(pwd)":/root/.local/share/mkcert alpine/mkcert -install
docker run --rm -v "$(pwd)":/root/.local/share/mkcert alpine/mkcert -cert-file /root/.local/share/mkcert/app.localhost.cert.pem -key-file /root/.local/share/mkcert/app.localhost.key.pem app.localhost localhost 127.0.0.1
sudo chmod a+r app.localhost.*

# Add root certificate to system trusted store
echo Trusting development certificates at the system level
sudo cp rootCA.pem /usr/local/share/ca-certificates/geogirafe-dev.crt
sudo update-ca-certificates

# Trust certificate in chrome
echo Trusting development certificates in Chrome
certutil -d sql:$HOME/.pki/nssdb -A -t TC -n "GeoGirafe LocalDevCert" -i rootCA.pem
# Trust the certificate in firefox
echo Trusting development certificates in Firefox
FIREFOX_PROFILE=$(grep -E 'Path=' ~/.mozilla/firefox/profiles.ini | grep default-release | cut -d'=' -f2)
certutil -d sql:$HOME/.mozilla/firefox/$FIREFOX_PROFILE -A -t "C,,C" -n "GeoGirafe LocalDevCert" -i rootCA.pem

echo Certificate was added successfully.
echo Please restart your browser to take it into account.
