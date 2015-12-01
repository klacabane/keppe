'use strict';

const fs = require('fs');
const path = require('path');
const spawn = require('child_process').spawn;
const AWS = require('aws-sdk');
AWS.config.credentials = {
  accessKeyId: process.env.AWSAccessKey,
  secretAccessKey: process.env.AWSSecretKey,
};
AWS.config.region = 'eu-central-1';

const s3 = new AWS.S3({params: {Bucket: 'keppe'}});
const _downloads = new Map();

module.exports = {
  /*
   * opts: Object{id, url, format}
   * returns Download
   */
  add: opts => {
    const dl = new Download(opts);
    _downloads.set(dl.id, dl);
    return dl;
  },

  get: id => {
    return _downloads.get(id);
  },
};

class Download {
  constructor(opts) {
    this.id = opts.id;
    this.opts = opts;
    this.err = null;
    this.localpath = '';
    this.state = 'init';
    this.progress = 0;
  }

  start() {
    return new Promise((resolve, reject) => {
      // TODO: write to tmp
      const child = spawn('youtube-dl', [
        '-x', '--audio-format', this.opts.format, '-o',
        `public/%(title)s.%(ext)s`, this.opts.url
      ]);

      child.stdout.on('data', chunk => {
        const match = String(chunk).match(/\[download\]\s*(\d*)(.\d*)?%/);
        if (match) {
          this.state = 'downloading';
          this.progress = parseInt(match[1]);
          if (this.progress === 100) {
            this.state = 'converting';
          }
        }

        if (this.progress === 100 && !this.localpath) {
          const dst = String(chunk).match(/Destination: (.*\.mp3)/);
          if (dst) {
            this.localpath = dst[1];
          }
        }
      });

      child.stderr.on('data', msg => {
        this.err = new Error(msg);
      });

      child.on('close', () => {
        if (this.err) {
          this.state = 'aborted';
          return reject(this.err);
        }
        resolve(this);
      });
    });
  }

  uploadLocal() {
    const upload = s3.upload({
      ACL: 'public-read',
      Body: fs.createReadStream(this.localpath),
      Key: 'music/'+path.basename(this.localpath),
    });
    upload.on('httpUploadProgress', progress => {
      this.progress = progress.total
        ? progress.loaded / progress.total
        : 0;
    });
    this.state = 'uploading';

    return new Promise((resolve, reject) => {
      upload.send((err, data) => {
        if (err) {
          this.state = 'aborted';
          return reject(err);
        }
        // TODO: remove local file
        this.state = 'done';
        this.location = data.Location;
        resolve(this);
      });
    });
    }
}
