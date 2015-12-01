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
  YOUTUBE_MUSIC: 2,
  YOUTUBE_VIDEO: 3,
  YOUTUBE_LINK: 4,
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
}

const itemConfig = (type, raw) => {
  switch (type) {
    case ITEM_TYPE.SOUNDCLOUD:
      return {
        type,
        title: raw.title,
        artist: raw.user.username,
        url: raw.uri,
        src: source['soundcloud'],
        srcId: raw.id,
        createdAt: moment(raw.created_at, 'YYYY/MM/DD HH:mm:ss ZZ'),
      };

    case ITEM_TYPE.YOUTUBE_MUSIC:
      return {
        type,
        title: '',
        artist: '',
        url: raw.url,
        src: source['youtube'],
        srcId: (raw.media && raw.media.type === 'youtu.be')
          ? raw.url.split('/').pop()
          : /watch\?v=([-_a-zA-Z0-9]*)/.exec(raw.url)[1]
      };

    case ITEM_TYPE.YOUTUBE_LINK:
      return {
        type,
        title: raw.title,
        url: raw.url,
        src: source['youtube'],
        createdAt: moment.unix(raw.created_utc),
        srcId: (raw.media && raw.media.type === 'youtu.be')
          ? raw.url.split('/').pop()
          : /watch\?v=([-_a-zA-Z0-9]*)/.exec(raw.url)[1]
      };
  }
};

class Item extends Immutable.Record({
  type: ITEM_TYPE.UNKNOWN,
  artist: '',
  title: '',
  url: '',
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
      values = itemConfig(type, raw);
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
