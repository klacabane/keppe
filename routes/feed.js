'use strict';

const ObjectId = require('mongodb').ObjectId;
const path = require('path');
const moment = require('moment');
const request = require('request-promise');
const s3util = require('../s3util.js');
const search = require('../search.js');
const Item = require('../public/src/models/item.js').Item;
const ITEM_TYPE = require('../public/src/models/item.js').ITEM_TYPE;

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

        res.json(docs.map(doc => Item.fromDb(doc)));
      });
  });

  router.post('/items', (req, res) => {
    insertIfNotExists(new Item(req.body))
      .then(doc => {
        if (doc.inserted) res.status(201);
        else res.status(200);

        res.json(Item.fromDb(doc));
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

          // Store moment objects as native objects
          const values = item
            .set('createdAt', item.createdAt.toDate())
            .set('releaseDate', item.releaseDate.toDate())
            .toObject();
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

  const cron = () => {
    const insert = arr => Promise.all(arr.map(insertIfNotExists));
    const filterDuplicates = items => {
      const seen = new Set();
      return items.filter(item => {
        return seen.has(item.srcId) ? false : !!seen.add(item.srcId);
      });
    };

    Promise
      .all([
        scTracks(
          channels
            .filter(c => c.media === 'soundcloud')
            .map(c => c.name)
        ),
        search.hhh('hot'),
        search.hhh('new'),
        search.upcoming(),
      ])
      .then(flatten)
      .then(filterDuplicates)
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
      Promise.all(accounts.map(search.scUser))
        .then(flatten)
        .then(resolve)
        .catch(reject);
    });
  };

  if (process.argv.length > 2) {
    console.log('starting cron');
    cron();
  }
};
