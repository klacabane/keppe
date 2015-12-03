'use strict';

const os = require('os');
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
  addDl: opts => {
    const dl = new Download(opts);
    _downloads.set(dl.id, dl);
    return dl;
  },
  getDl: id => _downloads.get(id),
  hasDl: id => _downloads.has(id),
  removeDl: id => _downloads.delete(id),

  removeFile(key) {
    s3.deleteObject({Key: key}, err => {
      if (err) console.log(err);
    });
  }
};

class Download {
  constructor(opts) {
    this.id = opts.id;
    this.opts = opts;
    this.err = null;
    this.localpath = '';
    this.state = 'init';
    this.progress = 0;

    // S3 config, set once uploaded
    this.bucketKey = '';
    this.location = '';
  }

  start() {
    return new Promise((resolve, reject) => {
      const child = spawn('youtube-dl', [
        '-x', '--audio-format', this.opts.format, '-o',
        `${os.tmpdir()}/%(title)s.%(ext)s`, this.opts.url
      ]);
      console.log('downloading');

      child.stdout.on('data', chunk => {
        const match = String(chunk).match(/\[download\]\s*(\d*)(.\d*)?%/);
        if (match) {
          this.state = 'downloading';
          this.progress = parseInt(match[1]);
        }

        if (this.progress === 100 && this.state !== 'converting') {
          this.state = 'converting';
          this.progress = 0;
        }

        if (!this.localpath) {
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
    const bucketKey = 'music/' + path.basename(this.localpath);
    const upload = s3.upload({
      ACL: 'public-read',
      Body: fs.createReadStream(this.localpath),
      Key: bucketKey,
    });
    upload.on('httpUploadProgress', progress => {
      this.progress = progress.total
        ? (progress.loaded / progress.total) * 100
        : 0;
    });
    console.log('uploading');
    this.state = 'uploading';

    return new Promise((resolve, reject) => {
      upload.send((err, data) => {
        if (err) {
          this.state = 'aborted';
          return reject(err);
        }

        fs.unlink(this.localpath, err => {
          if (err) console.log(`Error removing file ${this.localpath}:\n${err}`)
        });
        this.state = 'done';
        this.bucketKey = bucketKey;
        this.location = data.Location;
        resolve(this);
      });
    });
  }

  toJSON() {
    return {
      err: this.err,
      location: this.location,
      state: this.state,
      progress: this.progress,
    };
  }
}
