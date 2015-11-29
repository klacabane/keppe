'use strict';

const Immutable = require('immutable');
const moment = require('moment');

const REPEAT = {
  NEVER: 0,
  DAY: 1,
  WEEK: 2,
  MONTH: 3,
  YEAR: 4
}

class CalendarEvent extends Immutable.Record({
  starts: moment(),
  ends: moment().add(15, 'minutes'),
  title: 'Event',
  repeat: REPEAT.NEVER,
}) {

  constructor(values) {
    if (values) {
      values = {
        starts: moment(values.starts),
        ends: moment(values.ends),
        title: values.title,
        repeat: values.repeat || REPEAT.NEVER,
      };
    }

    super(values || {});
  }

  stringify() {
    return JSON.stringify({
      starts: this.starts.toDate(),
      ends: this.ends.toDate(),
      title: this.title,
      repeat: this.repeat,
    });
  }
}

const ITEM_TYPE = {
  UNKNOWN: 0,
  SOUNDCLOUD: 1,
  ARTICLE: 2,
  TRAILER: 3,
}

class Item extends Immutable.Record({
  type: ITEM_TYPE.UNKNOWN,
  artist: '',
  name: '',
  url: '',
  downloadUrl: '',
  src: {},
  uploaded: false,
  createdAt: moment(),
  srcId: 0,
}) {
  
  constructor(type, raw) {
    let values;
    if (typeof type === 'object') {
      values = type;
      values.createdAt = moment(type.createdAt);
    } else {
      switch (type) {
        case ITEM_TYPE.SOUNDCLOUD:
          values = {
            type: type,
            url: raw.uri,
            downloadUrl: raw.downloadable ? raw.download_url : '',
            src: {
              name: 'SoundCloud',
              img: '/images/soundcloud-icon.png',
            },
            srcId: raw.id,
            name: raw.title,
            artist: raw.user.username,
            createdAt: moment(raw.created_at, 'YYYY/MM/DD HH:mm:ss ZZ'),
          };
          break;
      }
    }

    super(values);
  }
}

module.exports = {
  CalendarEvent,
  REPEAT,
  Item,
  ITEM_TYPE,
};
