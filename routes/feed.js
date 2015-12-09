'use strict';

const ObjectId = require('mongodb').ObjectId;
const path = require('path');
const moment = require('moment');
const merge = require('merge');
const request = require('request-promise');
const s3util = require('../s3util.js').s3util;
const Download = require('../s3util.js').Download;
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
const err_download_not_supported = 'The item type cant be downloaded.';
const err_doc_not_found = 'Document not found.';

const flatten = arr => [].concat.apply([], arr);

const _downloads = new Map();

const availableFilters = ['hhh', 'mixtapes', 'soundcloud', 'upcoming'];

exports.setup = (router, db) => {
  router.delete('/items/:id', (req, res) => {
    // FIXME: should be reworked for mixtapes
    db.collection('items')
      .findOneAndUpdate(
        {_id: ObjectId.createFromHexString(req.params.id)}, 
        {$set: {removed: true}
      })
      .then(result => {
        if (result.value.uploaded && result.value.type !== ITEM_TYPE.MIXTAPE) {
          s3util.removeFile(result.value.bucketKey);
        }
        res.end();
      })
      .catch(err => {
        res.status(500).end();
        console.log(err);
      });
  });

  router.get('/items/feed/:start/:filters?', (req, res) => {
    const skip = Number(req.params.start);
    const query = {
      removed: {$exists: false},
      mixtapes: {$size: 0}, // dont display mixtape tracks
    };
    if (req.params.filters) {
      const conditions = [];
      req.params.filters
        .split(',')
        .forEach(filter => {
          if (availableFilters.indexOf(filter) > -1) {
            switch (filter) {
              case 'hhh':
                conditions.push({
                  src: 'hhh',
                });
                break;
              case 'mixtapes':
                conditions.push({
                  type: ITEM_TYPE.MIXTAPE,
                });
                break;
              case 'soundcloud':
                conditions.push({
                  type: ITEM_TYPE.SOUNDCLOUD,
                });
                break;
              case 'upcoming':
                conditions.push({
                  type: ITEM_TYPE.MIXTAPE,
                  releaseDate: {$gt: new Date()},
                });
                break;
            }
          }
        });
      if (conditions.length) query.$or = conditions;
    }
    
    db.collection('items')
      .find(query)
      .sort({createdAt: -1})
      .skip(skip)
      .limit(11)
      .toArray()
      .then(docs => docs.map(Item.fromDb))
      .then(items => {
        let hasMore = false;
        if (items.length > 10) {
          items.pop();
          hasMore = true;
        }
        res.json({
          items,
          hasMore,
        })
      })
      .catch(err => {
        res.status(500).end();
        console.log(err.stack);
      });
  });

  router.get('/items/mixtapes', (req, res) => {
    db.collection('items')
      .find({
        removed: {$exists: false},
        uploaded: true,
        type: ITEM_TYPE.MIXTAPE,
      })
      .sort({createdAt: -1})
      .toArray()
      .then(docs => Promise.all(docs.map(populateMixtape)))
      .then(items => res.json(items))
      .catch(err => {
        res.status(500).end();
        console.log(err.stack)
      });
  });

  router.get('/items/:id', (req, res) => {
    db.collection('items')
      .findOne({_id: ObjectId.createFromHexString(req.params.id)})
      .then(raw => {
        if (!raw) throw err_doc_not_found;
        if (!raw.tracks.length) return Item.fromDb(raw);

        return populateMixtape(raw);
      })
      .then(item => res.json(item))
      .catch(err => {
        if (err === err_doc_not_found) res.status(404);
        else res.status(500);
        res.end();
      });
  });

  router.get('/items/:id/download', (req, res) => {
    if (_downloads.has(req.params.id)) {
      return res.json(_downloads.get(req.params.id));
    }

    const validate = doc => {
      if (doc.uploaded) {
        res.json({
          status: 'done',
        });
        throw err_already_uploaded;
      } else if (doc.type !== ITEM_TYPE.MIXTAPE &&
             doc.type !== ITEM_TYPE.YOUTUBE) {
        res.status(500).end();
        throw err_download_not_supported;
      }
      return doc;
    };

    const download = doc => {
      const status = {status: 'processing'};
      _downloads.set(req.params.id, status);
      res.json(status);

      if (doc.type === ITEM_TYPE.MIXTAPE) {
        return search.mixtape(doc.url)
          .then(item => updateMixtape(doc._id, item));
      } else {
        const dl = new Download({
          id: req.params.id,
          url: doc.url,
        });
        return dl.start()
          .then(result => updateTrackFromDl(doc._id, result));
      }
    };

    db.collection('items')
      .findOne({_id: ObjectId.createFromHexString(req.params.id)})
      .then(validate)
      .then(download)
      .then(() => {
        _downloads.delete(req.params.id);
        console.log('done');
      })
      .catch(err => {
        _downloads.set(req.params.id, {status: 'aborted', err: err});
        console.log(err.stack);
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

  const populateMixtape = doc => {
    return db.collection('items')
      .find({mixtapes: doc._id})
      .sort({number: 1})
      .toArray()
      .then(docs => {
        return Item.fromDb(merge(doc, {
          tracks: docs.map(Item.fromDb),
        }));
      });
  };

  const updateTrackFromDl = (id, result) => {
    return db.collection('items')
      .updateOne(
        {_id: id},
        {$set: {
          title: result.title,
          url: result.location, 
          bucketKey: result.bucketKey,
          uploaded: true,
          type: ITEM_TYPE.TRACK,
          img: undefined,
        }}
      );
  };

  /**
   * id ObjectId - mixtape item to update
   * item Item - mixtape item with updated values
   * return object - updated document
   */
  const updateMixtape = (id, item) => {
    // insert item.tracks
    // update mixtape item
    const tracks = item.tracks
      .map(track => {
        const obj = track
          .set('createdAt', new Date())
          .toObject();
        obj.mixtapes = [id];
        delete obj.id;
        return obj;
      });

    return db.collection('items')
      .insertMany(tracks)
      .then(res => {
        return db.collection('items')
          .updateOne(
            {_id: id},
            {$set: {
              uploaded: true,
              tracks: res.insertedIds,
              img: item.img,
              title: item.title,
              artist: item.artist,
              srcId: item.srcId,
              releaseDate: new Date(), // FIXME find the actual release date,
              colors: item.colors,
            }}
          );
      });
  };


  /*
   * item: Item
   * returns object - {dbAttrs, inserted}
   */
  const insertIfNotExists = item => {
    return db.collection('items')
      .findOne({srcId: item.srcId})
      .then(doc => {
        if (doc) return doc;

        // Store moment objects as native objects
        const values = item
          .set('createdAt', item.createdAt.toDate())
          .set('releaseDate', item.releaseDate ? item.releaseDate.toDate() : null)
          .toObject();
        delete values.id;
        return db.collection('items').insertOne(values);
      })
      .then(doc => {
        if (doc._id) return doc;
        return merge(doc.ops[0], {inserted: true});
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
    return Promise.all(accounts.map(search.scUser))
      .then(flatten);
  };

  if (process.argv.length > 2) {
    console.log('starting cron');
    cron();
  }
};
