'use strict';

const spawn = require('child_process').spawn;

exports.setup = (router, db) => {
  router.get('/items', (req, res) => {});

  const download = (opts, done) => {
    const child = spawn('youtube-dl', [
      '-x', '--audio-format', opts.format, '-o',
      `${opts.dst}/%(title)s.%(ext)s`, opts.url
    ]);
    let err;
    let fullpath;

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
      done(err, fullpath); 
    });
  }
};
