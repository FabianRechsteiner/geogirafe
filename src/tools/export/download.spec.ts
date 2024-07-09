import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isSafari } from '../utils/utils';
import { saveAs } from 'file-saver';
import { download } from './download';

vi.mock('../utils/utils', () => ({
  isSafari: vi.fn()
}));

vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}));

describe('download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use the specified file type if not in Safari', () => {
    // @ts-ignore
    (isSafari as vi.Mock).mockReturnValue(false);
    const content = 'Test content';
    const fileName = 'test.txt';
    const fileType = 'text/plain;charset=utf-8';

    download(content, fileName, fileType);

    const expectedBlob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), content], { type: fileType });

    expect(saveAs).toHaveBeenCalledWith(expectedBlob, fileName);
  });

  it('should use text/plain;charset=utf-8 as file type if in Safari', () => {
    (isSafari as any).mockReturnValue(true);
    const content = 'Test content';
    const fileName = 'test.txt';
    const fileType = 'application/json';

    download(content, fileName, fileType);

    const expectedBlob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), content], { type: 'text/plain;charset=utf-8' });

    expect(saveAs).toHaveBeenCalledWith(expectedBlob, fileName);
  });

  it('should use text/plain;charset=utf-8 as file type if fileType is undefined', () => {
    (isSafari as any).mockReturnValue(false);
    const content = 'Test content';
    const fileName = 'test.txt';

    download(content, fileName, undefined);

    const expectedBlob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), content], { type: 'text/plain;charset=utf-8' });

    expect(saveAs).toHaveBeenCalledWith(expectedBlob, fileName);
  });
});
