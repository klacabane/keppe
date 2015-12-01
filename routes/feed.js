'use strict';

const http = require('http');
const path = require('path');
const moment = require('moment');
const downloads = require('../downloads.js');
const Item = require('../public/src/models/event.js').Item;
const ITEM_TYPE = require('../public/src/models/event.js').ITEM_TYPE;

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
          if (doc.uploaded) {
            res.status(200).end();
            throw 'Item is already uploaded.';
          }
          return Promise.resolve(doc);
        }
      })
      .then(doc => {
        const dl = downloads.add({
          format: 'mp3',
          url: doc.url,
          id: doc._id,
        });

        res.redirect(`downloads/${dl.id}`);

        return dl.start();
      })
      .then(dl => {
        console.log('download done');
        return dl.uploadLocal();
      })
      .then(dl => {
        console.log('upload done');
        return db.collection('items')
          .updateOne(
            {_id: dl.id},
            {$set: {
              url: dl.location, 
              uploaded: true,
              title: path.basename(dl.localpath, path.extname(dl.localpath)).trim(),
            }}
          );
      })
      .then(() => {
        console.log('done')
      })
      .catch(err => {
        if (err) console.log(err);
      });
  });

  router.get('/downloads/:id', (req, res) => {
    res.json(downloads.get(req.params.id));
  });


  const flatten = arr => [].concat.apply([], arr);

  const replaceHttps = s => s.replace('https', 'http');

  /*
   * Wraps http.get in a promise
   * url: string | object {url, path}
   * returns json response: object
   */
  const httpget = url => {
    if (typeof url === 'object') {
      url.host = replaceHttps(url.host);
      url.path = replaceHttps(url.path);
    } else {
      url = replaceHttps(url);
    }

    return new Promise((resolve, reject) => {
      http
        .get(url, res => {
          let body = '';
          res.on('data', chunk => {
            body += chunk;
          });
          res.on('error', reject);
          res.on('end', () => {
            resolve(JSON.parse(body));
          });
        })
        .on('error', reject);
    });
  };

  const scRequest = endpoint => {
    const url = 'http://api.soundcloud.com'
      + endpoint
      + (endpoint.indexOf('?') > -1 ? '&' : '?')
      + 'client_id=' + process.env.SCID;
    return httpget(url);
  };

  /*
   * Tries to resolve a soundcloud track url
   * No reject
   * url: string - Soundcloud track url
   * date: moment optional - Date overwriting the soundcloud creation date
   * returns Item | null
   */
  const findScTrack = (url, date) => {
    return new Promise((resolve, reject) => {
      scRequest(`/resolve?url=${url}`)
        .then(res => {
          if (res.errors) throw `Soundcloud /resolve error: ${res.errors[0].error_message}`;
          return httpget(res.location);
        })
        .then(raw => {
          if (raw.kind === 'track' && raw.streamable) {
            if (date) raw.created_at = date.format('YYYY/MM/DD HH:mm:ss ZZ');
            return new Item(ITEM_TYPE.SOUNDCLOUD, raw);
          }
          throw 'Soundcloud url is not streamable or isnt a track';
        })
        .then(resolve)
        .catch(err => {
          console.log('findScTrack error: ' + err);
          resolve(null);
        });
    });
  };


  /*
   * Retrieves the 'hot' hhh youtube links and 
   * streamable soundcloud tracks.
   * returns []Item
   */
  const hhh = () => {
    return new Promise((resolve, reject) => {
      httpget({
        host: 'www.reddit.com',
        path: '/r/hiphopheads/hot.json',
      })
      .then(body => {
        const promises = body.data.children
          .filter(item => {
            return item.data.media && 
              (item.data.media.type === 'soundcloud.com' || item.data.media.type === 'youtube.com');
          })
          .map(item => {
            if (item.data.media.type === 'soundcloud.com')
              return findScTrack(item.data.url, moment(item.created_utc));
            else 
              return Promise.resolve(new Item(ITEM_TYPE.YOUTUBE_LINK, item.data));
          });
        return Promise.all(promises);
      })
      .then(flatten)
      .then(items => items.filter(item => item !== null))
      .then(resolve)
      .catch(reject);
    });
  };

  const cron = () => {
    const toPromise = items => {
      const promises = items.map(item => {
        return db.collection('items').updateOne({srcId: item.srcId}, item.toJSON(), {upsert: true});
      });
      return Promise.all(promises);
    };

    Promise
      .all([
        scTracks(
          channels
            .filter(c => c.media === 'soundcloud')
            .map(c => c.name)
        ),
        hhh()
      ])
      .then(flatten)
      .then(toPromise)
      .then(result => {
        console.log(result.reduce((acc, next) => acc + next.upsertedCount, 0) + ' new items');
      })
      .catch(err => {
        console.log(`Cron error: ${err.stack}`);
      });
  };

  /*
   * Retrieves the streamable sounclound tracks
   * accounts: []string
   * returns []Item
   */
  const scTracks = accounts => {
    return new Promise((resolve, reject) => {
      Promise.all(accounts.map(tracks))
        .then(flatten)
        .then(resolve)
        .catch(reject);
    });
  };

  /*
   * Retrieves the streamable tracks of a SC artist
   * returns []Item
   */
  const tracks = artist => {
    return new Promise((resolve, reject) => {
      scRequest(`/users/${artist}/tracks`)
        .then(items => {
          const ret = items
            .filter(item => item.kind === 'track' && item.streamable)
            .map(item => new Item(ITEM_TYPE.SOUNDCLOUD, item))
          resolve(ret);
        })
        .catch(reject);
    });
  };
};
