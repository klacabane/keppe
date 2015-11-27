'use strict';

const Immutable = require('immutable');
const moment = require('moment');
const URL = require('url');

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
  MUSIC: 1,
  ARTICLE: 2,
  TRAILER: 3,
}

class Item extends Immutable.Record({
  type: ITEM_TYPE.UNKNOWN,
  name: '',
  url: '',
  html: '',
  src: '',
  uploaded: false,
  createdAt: moment(),
  srcId: 0,
}) {
  
  constructor(type, raw) {
    let values;
    switch (type) {
      case ITEM_TYPE.MUSIC:
        values = {
          type: type,
          url: raw.url,
          src: URL.parse(raw.url).hostname,
          srcId: raw.id,
          html: raw.html,
          name: raw.title,
        };
        break;
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
