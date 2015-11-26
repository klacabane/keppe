'use strict';

const spawn = require('child_process').spawn;
const Item = require('../public/src/models/event.js').Item;
const ITEM_TYPE = require('../public/src/models/event.js').ITEM_TYPE;
const SC = require('node-soundcloud');
SC.init({
  id: process.env.SCID,
  secret: process.env.SCSECRET,
});

const artists = [];

exports.setup = (router, db) => {
  router.get('/items', (req, res) => {
    ignored()
      .then(items => Promise.all([
          scTracks(items.filter(item => item.type === ITEM_TYPE.MUSIC))
        ])
      )
      .then(items => {
        res.json(items);
      })
      .catch(err => {
        console.log(err)
      });
  });

  const ignored = () => {
    return new Promise((resolve, reject) => {
      db.collection('ignored')
        .find()
        .toArray((err, items) => {
          if (err) return reject(err);
          resolve(items);
        });
    });
  };

  const scTracks = (ignore) => {
    return Promise.all(artists.map(artist => tracks(artist, ignore)))
  };

  const tracks = (artist, ignore) => {
    return new Promise((resolve, reject) => {
      SC.get(`/users/${artist}/tracks`, (err, items) => {
        if (err) return reject(err);

        const tracks = items
          .filter(item => item.kind === 'track' && item.streamable && !ignore.some(id => id === item.id))
          .map(item => new Item(ITEM_TYPE.MUSIC, item));
        resolve(tracks);
      });
    });
  };

  const download = (opts) => {
    return new Promise((resolve, reject) => {
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
        if (err) reject(err);
        else resolve(fullpath);
      });
    });
  };
};
