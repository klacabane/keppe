'use strict';

const request = require('request-promise');
const cheerio = require('cheerio');
const moment = require('moment');
const merge = require('merge');
const Item = require('./public/src/models/item.js').Item;
const ITEM_TYPE = require('./public/src/models/item.js').ITEM_TYPE;

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
      maxResults: max || 5,
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
  /**
   * returns []Item
   */
  youtube(term, max) {
    return ytRequest('/search', term, max)
      .then(res => {
        return res.items
          .filter(raw => {
            return raw.id.kind === 'youtube#video';
          })
          .map(raw => {
            return Item.fromApi(ITEM_TYPE.YOUTUBE, {
              title: raw.snippet.title,
              url: `http://youtube.com/watch?v=${raw.id.videoId}`,
            });
          });
      });
  },

  /**
   * returns []Item
   */
  datpiff(term, max) {
    const scrap = $ => {
      const items = [];
      $('#leftColumnWide')
        .find('.contentItem')
        .not('.noMedia')
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
            url: 'http://datpiff.com' + $elem.find('a').attr('href'),
          };
          values.srcId = `${values.title} - ${values.artist}`;

          items.push(Item.fromApi(ITEM_TYPE.MIXTAPE, values));
        });

      return items.slice(0, max || 5);
    };

    return request({
      uri: `http://www.datpiff.com/mixtapes-search?sort=rating&criteria=${term}`,
      transform: cheerio.load,
    })
    .then(scrap);
  },

  /**
   * id: string - YT video id
   * returns Item | null
   */
  youtubeVideo(id) {
    return ytRequest('/videos', id)
      .then(res => {
        let item = null;
        if (res.items.length) {
          item = Item.fromApi(ITEM_TYPE.YOUTUBE, {
            title: res.items[0].snippet.title,
            url: `http://youtube.com/watch?v=${id}`,
          });
        }
        return item;
      });
  },

  /**
   * Tries to resolve a soundcloud track url
   * No reject
   * url: string - Soundcloud track url
   * date: moment optional - Date overwriting the soundcloud creation date
   * returns Item | null
   */
  scTrack(url, date) {
    return scRequest(`/resolve?url=${url}`)
      .then(raw => {
        if (raw.kind === 'track' && raw.streamable) {
          if (date) raw.created_at = date.format('YYYY/MM/DD HH:mm:ss ZZ');
          return Item.fromApi(ITEM_TYPE.SOUNDCLOUD, raw);
        }
        throw 'Soundcloud url is not streamable or isnt a track';
      })
      .catch(err => {
        console.log('search.scTrack error: ' + err);
        return null;
      });
  },

  /**
   * Returns []Item - streamable tracks of a soundcloud user.
   */
  scUser(user) {
    return scRequest(`/users/${user}/tracks`)
      .then(result => {
        return result
          .filter(raw => raw.kind === 'track' && raw.streamable)
          .map(raw => Item.fromApi(ITEM_TYPE.SOUNDCLOUD, raw));
      });
  },

  /**
   * Returns []Item - upcoming mixtapes from datpiff.
   */
  upcoming() {
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
            img: $elem.find('img')
              .attr('src'),
            releaseDate: moment(
              new Date($elem.find('.countdown').text())
            ),
            url: 'http://datpiff.com' + $elem.find('a').attr('href'),
          };
          values.srcId = `${values.title} - ${values.artist}`;

          items.push(Item.fromApi(ITEM_TYPE.MIXTAPE, values));
        });

      return items;
    };

    /*
    return new Promise((resolve, reject) => {
      require('fs').readFile('../datpiff/datpiff-upcoming.html', 'utf8', (err, data) => {
        const items = [];
        const $ = cheerio.load(data);

        resolve(scrap($));
      })
      });
      */
    return request({
      uri: 'http://www.datpiff.com/upcoming',
      transform: cheerio.load,
    })
    .then(scrap)
  },


  /**
   * Sends a HEAD request in the bucket.
   * Track title is (randomly?) split if its too long (>50?)
   * Tries recursive requests until title length < 50
   * mixtapeId string
   * track object{number, title}
   * returns string - the track url
   */
  findMixtapeTrack(bucket, mixtapeId, track) {
    // Clean track title
    let fullTitle = track.title
      .replace(/(#|\.|,|'|\$|!)/g, '')
      .replace('&', ' ');
    fullTitle = ((track.number < 10 ? '0' : '') + track.number + ' - ' + fullTitle)
      .substring(0, 55); // start from a reasonable length

    const findUrl = title => {
      const url = `http://hw-mp3.datpiff.com/mixtapes/${bucket}/${mixtapeId}/${title}.mp3`;
      console.log('trying ' + url);
      return request({
        method: 'HEAD',
        uri: url,
      })
      .then(res => {
        return url;
      })
      .catch(err => {
        if (title.length < 50) throw 'Couldnt find track ' + fullTitle;
        return findUrl(title.substring(0, title.length-1));
      });
    };

    return findUrl(fullTitle);
  },

  /**
   * Tries to find a mixtape track url on buckets 1->8.
   * returns int - bucket id
   */
  findMixtapeBucket(mixtapeId, track) {
    const findTrack = bucket => {
      return search.findMixtapeTrack(bucket, mixtapeId, track)
        .then(() => {
          return bucket;
        })
        .catch(err => {
          if (bucket === 8) throw 'Couldnt find bucket:\nmixtape: ' + mixtapeId + '\ntrack: ' + track.title;
          return findTrack(bucket+1);
        });
    };

    return findTrack(1);
  },

  /**
   * Retrieves a datpiff mixtape.
   * returns Item - mixtape
   */
  mixtape(url) {
    const scrap = $ => {
      const $content = $('#leftColumnWide');
      const $info = $content.find('.info');

      const img = $content.find('#coverImage1').attr('src');
      const mixtape = {
        img,
        artist: $info.find('.artist').text(),
        title: $info.find('.title').text(),
        srcId: img.match(/http:\/\/hw-img.datpiff.com\/([a-z0-9A-Z]*)\/.*.(jpg|png)/)[1],
        tracks: [],
      };

      $('#leftColumnWide')
        .find('.tracklist li')
        .each((_, elem) => {
          const $elem = $(elem);
          const number = Number($elem.find('.tracknumber').text().replace('.', ''));
          const title = $elem.attr('title');

          mixtape.tracks.push({
            number,
            img,
            title,
            artist: mixtape.artist,
            srcId: mixtape.srcId + ' ' + number,
          });
        });

      return search
        .findMixtapeBucket(mixtape.srcId, mixtape.tracks[0])
        .then(bucket => {
          const promises = mixtape.tracks
            .map(raw => {
              return search.findMixtapeTrack(bucket, mixtape.srcId, raw)
                .then(url => Item.fromApi(ITEM_TYPE.TRACK, merge(raw, { url: url })))
                .catch(() => {
                  console.log('Couldnt find track ' + raw.title);
                  return Item.fromApi(ITEM_TYPE.TRACK, raw)
                });
            });

          return Promise.all(promises);
        })
        .then(items => {
          mixtape.tracks = items;
          return Item.fromApi(ITEM_TYPE.MIXTAPE, mixtape);
        });
    }

    return request({
      uri: url,
      transform: cheerio.load,
    })
    .then(scrap);
  },

  /*
   *
   * Retrieves the $endpoint hhh youtube links and 
   * streamable soundcloud tracks.
   * endpoint: one of ('hot','new','top')
   * returns []Item
   */
  hhh(endpoint) {
    const isSupported = raw => {
      const sc = raw.data.domain === 'soundcloud.com' && raw.data.url.indexOf('/sets/') === -1;
      const yt = ['youtube.com', 'youtu.be'].indexOf(raw.data.domain) > -1;
      return sc || yt;
    };
    const toItem = raw => {
      if (raw.data.domain === 'soundcloud.com')
        return search.scTrack(raw.data.url, moment.unix(raw.data.created_utc));
      else 
        return Item.fromApi(ITEM_TYPE.YOUTUBE, raw.data);
    };

    const filterMedia = body => body.data.children.filter(isSupported);
    const toItems = arr => Promise.all(arr.map(toItem));

    return redditRequest('hiphopheads', endpoint)
      .then(filterMedia)
      .then(toItems)
      .then(items => items.filter(item => item !== null))
  },
};

module.exports = search;
