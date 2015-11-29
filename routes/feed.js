'use strict';

const spawn = require('child_process').spawn;
const Item = require('../public/src/models/event.js').Item;
const ITEM_TYPE = require('../public/src/models/event.js').ITEM_TYPE;
const SC = require('node-soundcloud');
SC.init({
  id: process.env.SCID,
  secret: process.env.SCSECRET,
});

const channels = [
  {media: 'soundcloud', name: 'jazzcartier'},
  {media: 'soundcloud', name: 'whoisdaveeast'},
  {media: 'soundcloud', name: 'topdawgent'},
  {media: 'soundcloud', name: 'justsza'},
];

exports.setup = (router, db) => {
  router.get('/items', (req, res) => {
    db.collection('items')
      .find()
      .sort({createdAt: -1})
      .toArray((err, docs) => {
        if (err) console.log(err);

        res.json(docs);
      });
  });

  const cron = () => {
    Promise
      .all([
        scTracks()
      ])
      .then(items => {
        const promises = flatten(items)
          .map(item => {
            return db.collection('items').updateOne({srcId: item.srcId}, item.toJSON(), {upsert: true})
          });
        return Promise.all(promises);
      })
      .then(result => {
        console.log(result.reduce((acc, next) => acc + next.upsertedCount, 0) + ' new items');
      })
      .catch(err => {
        console.log(`Cron error: ${err.stack}`);
      });
  };

  /*
   * Retrieves the streamable sounclound tracks
   * Returns []Item
   */
  const scTracks = () => {
    return new Promise((resolve, reject) => {
      Promise.all(channels.map(channel => tracks(channel.name)))
        .then(result => resolve(flatten(result)))
        .catch(reject);
    });
  };

  /*
   * Retrieves the streamable tracks of a SC artist
   * returns []Item
   */
  const tracks = artist => {
    return new Promise((resolve, reject) => {
      SC.get(`/users/${artist}/tracks`, (err, items) => {
        if (err) return reject(err);

        const ret = items
          .filter(item => item.kind === 'track' && item.streamable)
          .map(item => new Item(ITEM_TYPE.SOUNDCLOUD, item));
        resolve(ret);
      });
    });
  };

  /*
   * Spawns a youtube-dl process
   * opts: Object {url, dst, format}
   */
  const download = opts => {
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

  const flatten = arr => [].concat.apply([], arr);
};
