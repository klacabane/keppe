'use strict';

const http = require('http');
const ObjectId = require('mongodb').ObjectId;
const path = require('path');
const moment = require('moment');
const s3util = require('../s3util.js');
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

const err_already_uploaded = 'Item is already uploaded.';

exports.setup = (router, db) => {
  router.delete('/items/:id', (req, res) => {
    db.collection('items')
      .findOneAndUpdate(
        {_id: ObjectId.createFromHexString(req.params.id)}, 
        {$set: {removed: true}
      })
      .then(result => {
        if (result.value.uploaded) s3util.removeFile(result.value.bucketKey);
        res.end();
      })
      .catch(err => {
        res.status(500).end();
        console.log(err);
      });
  });

  router.get('/items', (req, res) => {
    db.collection('items')
      .find({removed: {$exists: false}})
      .sort({createdAt: -1})
      .toArray((err, docs) => {
        if (err) console.log(err);

        res.json(docs);
      });
  });

  router.post('/items', (req, res) => {
    insertIfNotExists(new Item(req.body))
      .then(doc => {
        if (doc.inserted) res.status(201);
        else res.status(200);

        res.json(doc);
      })
      .catch(err => {
        console.log(err);
        res.status(500).end();
      });
  });

  router.get('/items/:id/download', (req, res) => {
    if (s3util.hasDl(req.params.id)) {
      return res.json(s3util.getDl(req.params.id));
    }

    const validate = doc => {
      if (doc.uploaded) {
        res.json({
          state: 'done',
          location: doc.url,
          progress: 100,
        });

        throw err_already_uploaded;
      }
      return doc;
    };

    const download = doc => {
      const dl = s3util.addDl({
        id: doc._id.toHexString(),
        url: doc.url,
        format: 'mp3',
      });

      res.json(dl);
      return dl.start();
    };

    const update = dl => {
      return db.collection('items')
        .findOneAndUpdate(
          {_id: ObjectId.createFromHexString(dl.id)},
          {$set: {
            url: dl.location, 
            bucketKey: dl.bucketKey,
            uploaded: true,
            title: path.basename(dl.localpath, path.extname(dl.localpath)).trim(),
            type: ITEM_TYPE.YOUTUBE_MUSIC,
          }}
        );
    }

    db.collection('items')
      .findOne({_id: ObjectId.createFromHexString(req.params.id)})
      .then(validate)
      .then(download)
      .then(dl => dl.uploadLocal())
      .then(update)
      .then(result => {
        s3util.removeDl(result.value._id.toHexString());
        console.log('done');
      })
      .catch(err => {
        console.log(err);
      });
  });


  const flatten = arr => [].concat.apply([], arr);
  const merge = (obj1, obj2) => Object.assign({}, obj1, obj2);

  const replaceHttps = s => s.replace('https', 'http');

  /*
   * item: Item
   * returns object - {dbAttrs, inserted}
   */
  const insertIfNotExists = item => {
    return new Promise((resolve, reject) => {
      db.collection('items')
        .findOne({srcId: item.srcId})
        .then(doc => {
          if (doc) return doc;

          const values = merge(item.toObject(), {
            createdAt: item.createdAt.toDate(),
          });
          delete values.id;
          return db.collection('items').insertOne(values);
        })
        .then(doc => {
          if (doc._id) return resolve(doc);
          resolve(
            merge(doc.ops[0], {inserted: true})
          );
        })
        .catch(reject);
    });
  };

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
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(`Couldnt parse the response as json:\n url: ${url}\n body: ${body}`);
            }
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
    const insert = arr => Promise.all(arr.map(insertIfNotExists));

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
      .then(insert)
      .then(result => {
        console.log(result.filter(doc => doc.inserted).length + ' new items');
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

  if (process.argv.length > 2) {
    console.log('starting cron');
    cron();
  }
};
