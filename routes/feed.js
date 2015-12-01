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
    // Ends response if document is already uploaded or on db error.
    // Response will otherwise be redirected to the download status endpoint.
    const createIfNotExists = doc => {
      if (doc) {
        if (doc.uploaded) {
          res.status(200).end();
          throw 'Item is already uploaded.';
        }
        return doc;
      } else {
        return new Promise((resolve, reject) => {
          db.collection('items')
            .insertOne(req.body)
            .then(result => resolve(result.ops[0]))
            .catch(err => {
              res.end();
              reject(err);
            });
        });
      }
    };

    const download = doc => {
      const dl = downloads.add({
        format: 'mp3',
        url: doc.url,
        id: doc._id,
      });

      res.redirect(`downloads/${dl.id}`);

      console.log('download started');
      return dl.start();
    };

    const upload = dl => {
      console.log('upload started')
      return dl.uploadLocal();
    }

    const update = dl => {
      return db.collection('items')
        .updateOne(
          {_id: dl.id},
          {$set: {
            url: dl.location, 
            uploaded: true,
            title: path.basename(dl.localpath, path.extname(dl.localpath)).trim(),
          }}
        );
    }

    db.collection('items')
      .findOne({srcId: req.body.srcId, type: req.body.type})
      .then(createIfNotExists)
      .then(download)
      .then(upload)
      .then(update)
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

  const supportedMedia = ['soundcloud.com', 'youtube.com', 'youtu.be'];

  /*
   * Retrieves the 'hot' hhh youtube links and 
   * streamable soundcloud tracks.
   * returns []Item
   */
  const hhh = () => {
    const isSupported = item => {
      // first check for a media obj
      const withMedia = item.data.media && supportedMedia.indexOf(item.data.media.type) > -1;
      // fallback on domain
      const noMedia = supportedMedia.indexOf(item.domain) > -1;
      return withMedia || noMedia;
    };

    const toItem = item => {
      if (item.data.media.type === 'soundcloud.com')
        return findScTrack(item.data.url, moment(item.created_utc));
      else 
        return new Item(ITEM_TYPE.YOUTUBE_LINK, item.data);
    };

    const filterMedia = body => body.data.children.filter(isSupported);
    const toItems = arr => Promise.all(arr.map(toItem));

    return new Promise((resolve, reject) => {
      httpget({
        host: 'www.reddit.com',
        path: '/r/hiphopheads/hot.json',
      })
      .then(filterMedia)
      .then(toItems)
      .then(items => items.filter(item => item !== null))
      .then(resolve)
      .catch(reject);
    });
  };

  const cron = () => {
    const updateOne = item => db.collection('items').updateOne({srcId: item.srcId}, item.toJSON(), {upsert: true});
    const upsert = arr => Promise.all(arr.map(updateOne));

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
      .then(upsert)
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
    const filterStreamable = arr => arr.filter(item => item.kind === 'track' && item.streamable);
    const toItems = arr => arr.map(item => new Item(ITEM_TYPE.SOUNDCLOUD, item));

    return new Promise((resolve, reject) => {
      scRequest(`/users/${artist}/tracks`)
        .then(filterStreamable)
        .then(toItems)
        .then(resolve)
        .catch(reject);
    });
  };
};
