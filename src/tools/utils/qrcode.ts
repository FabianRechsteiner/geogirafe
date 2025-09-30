import QRCodeStyling from 'qr-code-styling';

export async function generateQrCode(url: string) {
  const qrcode = new QRCodeStyling({
    width: 300,
    height: 300,
    type: 'svg',
    data: url,
    image: 'images/logo/logo_icon.svg',
    dotsOptions: {
      color: '#575757ff',
      type: 'rounded',
      roundSize: true
    },
    backgroundOptions: {
      color: '#e9ebee'
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 6,
      imageSize: 0.4
    }
  });

  const blob = (await qrcode.getRawData('svg')) as Blob;
  const base64 = await blobToBase64(blob);
  return `data:${blob.type};base64,${base64}`;
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const base64String = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCodePoint(byte), ''));
  return base64String;
}
