'use strict';

const request = require('request-promise');
const cheerio = require('cheerio');
const moment = require('moment');
const Item = require('./public/src/models/event.js').Item;
const ITEM_TYPE = require('./public/src/models/event.js').ITEM_TYPE;

const scRequest = endpoint => {
  return request({
    uri: 'http://api.soundcloud.com' + endpoint,
    qs: {
      client_id: process.env.SCID,
    },
    json: true,
  });
};

const ytRequest = (endpoint, query, max) => {
  return request({
    uri: 'https://www.googleapis.com/youtube/v3' + endpoint,
    json: true,
    qs: {
      key: process.env.YTApiKey,
      part: 'id,snippet',
      q: query,
      id: query,
      maxResults: max || 10,
    },
  })
};

const redditRequest = (sub, endpoint) => {
  return request({
    uri: `https://reddit.com/r/${sub}/${endpoint}.json`,
    json: true,
  });
};

const search = {
  /*
   * returns []Item
   */
  youtube: (term, max) => {
    return new Promise((resolve, reject) => {
      ytRequest('/search', term, max)
        .then(res => {
          const items = res.items
            .filter(raw => {
              return raw.id.kind === 'youtube#video';
            })
            .map(raw => {
              return new Item(ITEM_TYPE.YOUTUBE_LINK, {
                title: raw.snippet.title,
                url: `http://youtube.com/watch?v=${raw.id.videoId}`,
              });
            });

          resolve(items);
        })
        .catch(reject);
    });
  },


  /*
   * id: string - YT video id
   * returns Item | null
   */
  youtubeVideo: id => {
    return new Promise((resolve, reject) => {
      ytRequest('/videos', id)
      .then(res => {
        let item = null;
        if (res.items.length) {
          item = new Item(ITEM_TYPE.YOUTUBE_LINK, {
            title: res.items[0].snippet.title,
            url: `http://youtube.com/watch?v=${id}`,
          });
        }
        resolve(item);
      })
      .catch(reject);
    });
  },

  /*
   * Tries to resolve a soundcloud track url
   * No reject
   * url: string - Soundcloud track url
   * date: moment optional - Date overwriting the soundcloud creation date
   * returns Item | null
   */
  scTrack: (url, date) => {
    return new Promise((resolve, reject) => {
      scRequest(`/resolve?url=${url}`)
        .then(raw => {
          if (raw.kind === 'track' && raw.streamable) {
            if (date) raw.created_at = date.format('YYYY/MM/DD HH:mm:ss ZZ');
            return new Item(ITEM_TYPE.SOUNDCLOUD, raw);
          }
          throw 'Soundcloud url is not streamable or isnt a track';
        })
        .then(resolve)
        .catch(err => {
          console.log('search.scTrack error: ' + err);
          resolve(null);
        });
    });
  },

  /*
   * Returns the streamable tracks of a soundcloud user.
   */
  scUser: user => {
    return new Promise((resolve, reject) => {
      scRequest(`/users/${user}/tracks`)
        .then(items => {
          return items
            .filter(item => item.kind === 'track' && item.streamable)
            .map(item => new Item(ITEM_TYPE.SOUNDCLOUD, item));
        })
        .then(resolve)
        .catch(reject);
    });
  },

  // search mixtapes:   GET http://www.datpiff.com/mixtapes-search?criteria=
  // prepare download:  GET http://www.datpiff.com/pop-mixtape-download.php?id=
  // actual download:   POST http://www.datpiff.com/download-mixtape body: id 
  upcoming: () => {
    const scrap = $ => {
      var items = [];
      $('#leftColumnWide')
        .find('.contentItem.grayed')
        .each((i, elem) => {
          var $elem = $(elem);
          const values = {
            title: $elem.find('.title a')
              .attr('title')
              .replace('listen to', '')
              .trim(),
            artist: $elem.find('.artist')
              .text()
              .trim(),
            releaseDate: moment(
              new Date($elem.find('.countdown').text())
            ),
            url: 'http://datpiff.com' + $elem.find('a').attr('href'),
          };
          values.srcId = `${values.title} - ${values.artist}`;

          items.push(new Item(ITEM_TYPE.DATPIFF, values));
        });

      return items;
    };

    return new Promise((resolve, reject) => {
      require('fs').readFile('../datpiff/datpiff-upcoming.html', 'utf8', (err, data) => {
        const items = [];
        const $ = cheerio.load(data);

        resolve(scrap($));
      })
    });
    /*
    request({
      uri: 'http://www.datpiff.com/upcoming',
      transform: body => {
        return cheerio.load(body)
      })
      .then(scrap)
      .then(resolve)
      .catch(reject);
    */
  },

  /*
   *
   * Retrieves the $endpoint hhh youtube links and 
   * streamable soundcloud tracks.
   * endpoint: one of ('hot','new','top')
   * returns []Item
   */
  hhh: endpoint => {
    return new Promise((resolve, reject) => {
      const isSupported = raw => {
        const sc = raw.data.domain === 'soundcloud.com' && raw.data.url.indexOf('/sets/') === -1;
        const yt = ['youtube.com', 'youtu.be'].indexOf(raw.data.domain) > -1;
        return sc || yt;
      };
      const toItem = raw => {
        if (raw.data.domain === 'soundcloud.com')
          return search.scTrack(raw.data.url, moment.unix(raw.data.created_utc));
        else 
          return new Item(ITEM_TYPE.YOUTUBE_LINK, raw.data);
      };

      const filterMedia = body => body.data.children.filter(isSupported);
      const toItems = arr => Promise.all(arr.map(toItem));

      redditRequest('hiphopheads', endpoint)
        .then(filterMedia)
        .then(toItems)
        .then(items => items.filter(item => item !== null))
        .then(resolve)
        .catch(reject);
    })
  },
};

module.exports = search;
