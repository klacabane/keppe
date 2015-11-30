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
  {media: 'soundcloud', name: 'cousinstizz'},
  {media: 'soundcloud', name: 'villainpark'},
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

  router.post('/items', (req, res) => {
    db.collection('items')
      .findOne({srcId: req.body.srcId, type: req.body.type})
      .then(doc => {
        if (!doc) {
          return new Promise((resolve, reject) => {
            db.collection('items')
              .insertOne(req.body)
              .then(result => resolve(result.ops[0]))
              .catch(reject);
          });
        } else {
          return Promise.resolve(doc);
        }
      })
      .then(doc => {
        const dl = downloads.add({
          format: 'mp3',
          dst: 'public',
          url: doc.url,
        });

        dl.start()
          .then(filename => {
            console.log('done: ' + filename);
            // update doc
          })
          .catch(err => {
            console.log('dl error:' + err)
          });

        res.redirect(`downloads/${dl.id}`);
      })
      .catch(err => {
        console.log(err)
        res.statusCode(500)
      });
  });

  router.get('/downloads/:id', (req, res) => {
    res.json(downloads.get(req.params.id));
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

  const reProgress = /\[download\]\s*(\d*)(.\d*)?%/;
  /*
   * Spawns a youtube-dl process
   */

  const downloads = {
    _downloads: new Map(),

    /*
     * opts: Object {url, dst, format}
     */
    add(opts) {
      const dl = new Download(opts);
      this._downloads.set(dl.id, dl);
      return dl;
    },

    get(id) {
      return this._downloads.get(id);
    },
  }

  class Download {
    constructor(opts) {
      this.id = Date.now();
      this.opts = opts;
      this.err = null;
      this.fullpath = '';
      this.state = 'init';
    }

    start() {
      return new Promise((resolve, reject) => {
        const child = spawn('youtube-dl', [
          '-x', '--audio-format', this.opts.format, '-o',
          `${this.opts.dst}/%(title)s.%(ext)s`, this.opts.url
        ]);

        child.stdout.on('data', chunk => {
          const match = String(chunk).match(reProgress);
          if (match) {
            this.state = 'downloading';
            this.progression = parseInt(match[1]);
            console.log(this.progression)
            if (this.progression === 100) {
              this.state = 'converting';
            }
          }

          if (this.progression === 100) {
            const dst = String(chunk).match(/Destination: (.*\.mp3)/);
            if (dst) {
              this.fullpath = dst[1];
              this.state = 'done';
            }
          }
        });

        child.stderr.on('data', msg => {
          this.err = new Error(msg);
          this.state = 'aborted';
        });

        child.on('close', () => {
          if (this.err) reject(this.err);
          else resolve(this.fullpath);
        });
      });
    }
  }

  const flatten = arr => [].concat.apply([], arr);
};
