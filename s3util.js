'use strict';

const unzip = require('unzip');
const os = require('os');
const fs = require('fs');
const path = require('path');
const merge = require('merge');
const spawn = require('child_process').spawn;
const request = require('request-promise');
const ITEM_TYPE = require('./public/src/models/item.js').ITEM_TYPE;
const AWS = require('aws-sdk');
AWS.config.credentials = {
  accessKeyId: process.env.AWSAccessKey,
  secretAccessKey: process.env.AWSSecretKey,
};
AWS.config.region = 'eu-central-1';

const s3 = new AWS.S3({params: {Bucket: 'keppe'}});

const s3util = {
  removeFile(key) {
    s3.deleteObject({Key: key}, err => {
      if (err) console.log(err);
    });
  },
};

class Pending {
  constructor(conf) {
    this.state = {
      err: null,
      title: conf.title || '',
      status: 'init',
      progress: 0,
      children: [],
    };
  }

  toJSON() {
    return {
      err: this.state.err,
      status: this.state.status,
      progress: this.state.progress,
    };
  }
}

class Download extends Pending {
  constructor(conf) {
    super(conf);
    this.url = conf.url;
    this.format = conf.format || 'mp3';
  }

  start() {
    let localpath;

    return new Promise((resolve, reject) => {
      const child = spawn('youtube-dl', [
        '-x', '--audio-format', this.format, '-o',
        `${os.tmpdir()}/%(title)s.%(ext)s`, this.url
      ]);

      console.log('downloading');

      child.stdout.on('data', chunk => {
        const match = String(chunk).match(/\[download\]\s*(\d*)(.\d*)?%/);
        if (match) {
          this.state.status = 'downloading';
          this.state.progress = parseInt(match[1]);
        }

        if (this.state.progress === 100 && this.state.status !== 'converting') {
          this.state.status = 'converting';
          this.state.progress = 0;
        }

        if (!localpath) {
          const dst = String(chunk).match(/Destination: (.*\.mp3)/);
          if (dst) {
            localpath = dst[1];
          }
        }
      });

      child.stderr.on('data', msg => {
        this.state.err = new Error(msg);
      });

      child.on('close', () => {
        if (this.state.err) {
          this.state.status = 'aborted';
          return reject(this.state.err);
        }

        const upload = new Upload({
          filename: path.basename(localpath),
          body: fs.createReadStream(localpath)
            .on('close', () => {
              fs.unlink(localpath, err => {
                if (err) console.log('Error removing ' + localpath + '\n' + err)
              })
            }),
        });

        resolve(upload.start());
      });
    });
  }
}

class Upload extends Pending {
  constructor(conf) {
    super(merge(conf, {
      title: path.basename(conf.filename, path.extname(conf.filename)).trim()
    }));

    this.filename = conf.filename;
    this.body = conf.body;
    this.bucketKey = '';
    this.location = '';
  }

  start() {
    return new Promise(resolve => {
      const bucketKey = 'music/' + this.filename;
      const upload = s3.upload({
        ACL: 'public-read',
        Body: this.body,
        Key: bucketKey,
      });

      console.log('uploading ' + this.state.filename);

      this.state.status = 'uploading';

      upload.on('httpUploadProgress', progress => {
        this.state.progress = progress.total
          ? Math.round((progress.loaded / progress.total) * 100)
          : 0;
      });

      upload.send((err, data) => {
        if (err) {
          this.state.err = err;
          this.state.status = 'aborted';
          return reject(err);
        }
        console.log('done uploading ' + this.state.title);

        this.state.status = 'done';
        this.state.bucketKey = bucketKey;
        this.state.location = data.Location;
        resolve(this.state);
      });
    });
  }
}

/*
class MixtapeDownload extends Pending {
  constructor(conf) {
    super(conf);
  }

  start() {
    return new Promise((resolve, reject) => {
      let i = 0;
      let completed = 0;
      const uploads = [];

      fs.createReadStream('../datpiff/mixtape.zip')
        .pipe(unzip.Parse())
        .on('entry', entry => {

          if (entry.type === 'File' && path.extname(entry.path) === '.mp3' && i++ < 5) {
            const upload = new Upload({
              title: path.basename(entry.path),
              filename: entry.path,
              body: entry,
              type: 'track',
            })
            .start()
            .then(result => {
              completed++;
              this.state.progress = (completed / uploads.length) * 100;
              return result;
            });

            uploads.push(upload)
          } else {
            entry.autodrain();
          }
        })
        .on('close', () => {
          Promise.all(uploads)
            .then(results => {
              this.state.children = results;
              resolve(this.state);
            })
            .catch(reject);
        })
        .on('error', reject);
    });
  }
}
*/

module.exports = {
  s3util,
  Download,
};
