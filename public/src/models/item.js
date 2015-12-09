'use strict';

const Immutable = require('immutable');
const moment = require('moment');
const merge = require('merge');

const ITEM_TYPE = {
  UNKNOWN: 0,
  SOUNDCLOUD: 1,
  YOUTUBE: 2,
  TRACK: 3,
  MIXTAPE: 4,
}

const reYtId = /watch\?v=([-_a-zA-Z0-9]*)/;

class Item extends Immutable.Record({
  id: '',
  type: ITEM_TYPE.UNKNOWN,
  artist: '',
  title: '',
  url: '',
  img: '',
  uploaded: false,
  createdAt: moment(),
  releaseDate: null,
  src: '',
  srcId: 0,
  number: 0,
  mixtapes: [],
  tracks: [], 
}) {

  constructor(values) {
    values.createdAt = moment(values.createdAt);
    values.releaseDate = values.releaseDate ? moment(values.releaseDate) : null;
    values.type = typeof values.type === 'string'
      ? Number(values.type)
      : values.type;
    values.number = typeof values.number === 'string'
      ? Number(values.number)
      : values.number;
    values.uploaded = typeof values.uploaded === 'string'
      ? values.uploaded === 'true'
      : !!values.uploaded;
    values.img = values.img || '/images/mixtape-icon.png';
    super(values);
  }

  static fromDb(doc) {
    const values = Object.assign({}, doc, {
      id: doc._id.toHexString(),
    });

    return new Item(values);
  }

  static fromApi(type, raw) {
    let values = {};
    switch (type) {
      case ITEM_TYPE.SOUNDCLOUD:
        values = {
          type,
          title: raw.title.replace(/&amp;/g, '&'),
          artist: raw.user.username,
          url: raw.uri,
          img: '/images/soundcloud-icon.png',
          src: raw.src || 'soundcloud',
          srcId: raw.id,
          createdAt: raw.createdAt
            ? raw.createdAt
            : moment(raw.created_at, 'YYYY/MM/DD HH:mm:ss ZZ'),
        };
        break;

      case ITEM_TYPE.YOUTUBE:
        values = {
          type,
          title: raw.title,
          url: raw.url,
          img: '/images/youtube-icon.png',
          src: raw.src || 'youtube',
          srcId: raw.domain === 'youtu.be'
            ? raw.url.split('/').pop()
            : reYtId.exec(unescape(raw.url))[1],
        };
        break;

      case ITEM_TYPE.MIXTAPE:
      case ITEM_TYPE.TRACK:
        values = merge(raw, {
          type,
        });
        break;
    }

    return new Item(values);
  }
}

module.exports = {
  Item,
  ITEM_TYPE,
};
