import GirafeHTMLElement from '../../base/GirafeHTMLElement';
import { v4 as uuidv4 } from 'uuid';
import VideoIcon from './images/video.svg';
import StopIcon from './images/stop.svg';
import DownloadIcon from './images/download.svg';

class VideoRecordComponent extends GirafeHTMLElement {
  templateUrl = './template.html';
  styleUrl = './style.css';

  public videoIcon: string = VideoIcon;
  public stopIcon: string = StopIcon;
  public downloadIcon: string = DownloadIcon;

  status: 'downloaded' | 'recording' | 'recorded' = 'downloaded';
  mediaRecorder: MediaRecorder | null = null;
  chunks: Blob[] = [];
  stream: MediaStream | null = null;

  constructor() {
    super('videorecord');
  }

  connectedCallback() {
    this.loadConfig().then(() => {
      super.render();
      super.girafeTranslate();
    });
  }

  async startRecording() {
    this.status = 'recording';
    super.render();

    this.chunks = [];
    if (this.mediaRecorder) {
      // Try to start the recorder
      try {
        this.mediaRecorder.start();
      } catch {
        // If an exception is thrown, if probaly means that the screen share was stopped.
        this.mediaRecorder = null;
      }
    }

    if (!this.mediaRecorder) {
      if (await this.initializeMediaRecorder()) {
        this.mediaRecorder!.start();
      }
    }
  }

  async initializeMediaRecorder() {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        }
      });
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm; codecs:vp9',
        bitsPerSecond: 5000000 // 5 Mbps
      });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      return true;
    } catch (exception) {
      console.warn('Unable to activate recording : ' + exception);
      this.status = 'downloaded';
      super.render();
    }

    return false;
  }

  stopRecording() {
    this.status = 'recorded';
    super.render();
    this.mediaRecorder?.stop();
  }

  downloadRecord() {
    this.status = 'downloaded';
    super.render();

    // Create video blob
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    const filename: string = uuidv4() + '.webm';
    const videoURL = URL.createObjectURL(blob);

    // Create download link
    const downloadLink: HTMLAnchorElement = document.createElement('a');
    downloadLink.style.display = 'none';
    downloadLink.href = videoURL;
    downloadLink.download = filename;

    // Simulate click on download link
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clear
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(videoURL);
  }
}

export default VideoRecordComponent;
