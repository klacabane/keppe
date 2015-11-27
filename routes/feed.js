'use strict';

const http = require('http');
const spawn = require('child_process').spawn;
const Item = require('../public/src/models/event.js').Item;
const ITEM_TYPE = require('../public/src/models/event.js').ITEM_TYPE;
const SC = require('node-soundcloud');
SC.init({
  id: process.env.SCID,
  secret: process.env.SCSECRET,
});

const channels = [];

exports.setup = (router, db) => {
  router.get('/items', (req, res) => {
    db.collection('items')
      .find()
      .toArray((err, docs) => {
        if (err) console.log(err);

        res.json(docs);
      });
  });

  const cron = () => {
    ignored()
      .then(items => Promise.all([
          scTracks(items.filter(item => item.type === ITEM_TYPE.MUSIC))
        ])
      )
      .then(items => {
        if (items.length) {
          db.collection('items')
            .insertMany(flatten(items), (err, result) => {
              if (err) return Promise.reject(err);
            });
        }
      })
      .catch(err => {
        console.log(`Cron error: ${err}`);
      });
  };

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
    return new Promise((resolve, reject) => {
      Promise.all(channels.map(channel => tracks(channel.name, ignore)))
        .then(result => resolve(flatten(result)))
        .catch(reject);
    });
  };

  const tracks = (artist, ignore) => {
    return new Promise((resolve, reject) => {
      SC.get(`/users/${artist}/tracks`, (err, items) => {
        if (err) return reject(err);

        const promises = items
          .filter(item => item.kind === 'track' && item.streamable && !ignore.some(id => id === item.id))
          .map(item => getTrack(item));

        Promise.all(promises)
          .then(resolve)
          .catch(reject);
      });
    });
  };

  const flatten = (arr) => [].concat.apply([], arr);

  const getTrack = (data) => {
    return new Promise((resolve, reject) => {
      http.get(`http://soundcloud.com/oembed.json?url=${data.uri}&color=3C9FCE&liking=false`, 
        res => {
          let body = '';

          res.on('data', chunk => {
            body += chunk;
          });

          res.on('end', () => {
            const track = {
              id: data.id,
              url: data.uri,
              title: data.title,
              type: ITEM_TYPE.MUSIC,
              html: JSON.parse(body).html,
            };
            resolve(new Item(ITEM_TYPE.MUSIC, track));
          });

        })
        .on('error', reject);
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
