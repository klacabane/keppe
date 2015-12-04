'use strict';

const Immutable = require('immutable');
const moment = require('moment');

const ITEM_TYPE = {
  UNKNOWN: 0,
  SOUNDCLOUD: 1,
  YOUTUBE_MUSIC: 2,
  YOUTUBE_VIDEO: 3,
  YOUTUBE_LINK: 4,
  DATPIFF: 5,
}

const source = {
  'youtube': {
    name: 'YouTube',
    img: '/images/youtube-icon.png',
  },
  'soundcloud': {
    name: 'SoundCloud',
    img: '/images/soundcloud-icon.png',
  },
  'datpiff': {
    name: 'DatPiff',
    img: '/images/datpiff-icon.png',
  },
}

const reYtId = /watch\?v=([-_a-zA-Z0-9]*)/;

class Item extends Immutable.Record({
  id: '',
  type: ITEM_TYPE.UNKNOWN,
  artist: '',
  title: '',
  url: '',
  src: {},
  uploaded: false,
  createdAt: moment(),
  releaseDate: moment(),
  srcId: 0,
}) {

  constructor(values) {
    values.createdAt = moment(values.createdAt);
    values.releaseDate = moment(values.releaseDate);
    values.type = typeof values.type === 'string'
      ? parseInt(values.type)
      : values.type;
    values.uploaded = typeof values.uploaded === 'string'
      ? values.uploaded === 'true'
      : values.uploaded;
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
          title: raw.title,
          artist: raw.user.username,
          url: raw.uri,
          src: source['soundcloud'],
          srcId: raw.id,
          createdAt: moment(raw.created_at, 'YYYY/MM/DD HH:mm:ss ZZ'),
        };
        break;

      case ITEM_TYPE.YOUTUBE_MUSIC:
        values = {
          type,
          title: '',
          artist: '',
          url: raw.url,
          src: source['youtube'],
          srcId: (raw.domain === 'youtu.be')
            ? raw.url.split('/').pop()
            : reYtId.exec(unescape(raw.url))[1],
        };
        break;

      case ITEM_TYPE.YOUTUBE_LINK:
        values = {
          type,
          title: raw.title,
          url: raw.url,
          src: source['youtube'],
          srcId: raw.domain === 'youtu.be'
            ? raw.url.split('/').pop()
            : reYtId.exec(unescape(raw.url))[1],
        };
        break;

      case ITEM_TYPE.DATPIFF:
        values = Object.assign(raw, {
          type,
          src: source['datpiff'],
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
