// SPDX-License-Identifier: Apache-2.0
import { isSafari } from '../utils/utils';
import { saveAs } from 'file-saver';

/**
 * A function to start a download for a file.
 *
 * @param content The content of the file to download.
 * @param fileName The name of the file to download.
 * @param opt_fileType The type of the file to download.
 */
export const download = (content: string, fileName: string, opt_fileType: string | undefined): void => {
  // Safari does not properly work with FileSaver. Using the the type 'text/plain'
  // makes it a least possible to show the file content so that users can
  // do a manual download with "Save as".
  // See also: https://github.com/eligrey/FileSaver.js/issues/12
  const fileType: string = opt_fileType !== undefined && !isSafari() ? opt_fileType : 'text/plain;charset=utf-8';

  const blob = new Blob(
    [
      new Uint8Array([0xef, 0xbb, 0xbf]), // UTF-8 BOM
      content
    ],
    { type: fileType }
  );
  saveAs(blob, fileName);
};
