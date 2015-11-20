'use strict';

const spawn = require('child_process').spawn;
const Promise = require('promise');

exports.setup = (router, db) => {
  router.get('/items', (req, res) => {});

  const download = (opts) => {
    return new Promise((resolve, reject) => {
      let err;
      let fullpath;
      const child = spawn('youtube-dl', [
        '-x', '--audio-format', opts.format, '-o',
        `${opts.dst}/%(title)s.%(ext)s`, opts.url
      ]);

      child.stdout.on('data', chunk => {
        const dst = chunk.toString()
          .match(/Destination: (.*\.mp3)/);
        if (dst) {
          fullpath = dst[1];
        }
      });

      child.stderr.on('data', msg => {
        err = new Error(msg);
      });

      child.on('close', () => {
        if (err) reject(err);
        else resolve(fullpath);
      });
    });
  };
};
