'use strict';

const async = require('async');
const bodyParser = require('body-parser');
const express = require('express');
const mongo = require('mongodb').MongoClient;
const moment = require('moment');
const spawn = require('child_process').spawn;
const CalendarEvent = require('./public/src/models/event.js').CalendarEvent;
const REPEAT = require('./public/src/models/event.js').REPEAT;
const conf = {
  db: 'keppe',
  port: 8000
};

mongo.connect(process.env.MONGODB+'/'+conf.db, (err, db) => {
  if (err) throw err;

  let app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  let router = express.Router();

  router.get('/items', (req, res) => {});

  router.get('/calendar/:year/:month', (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const starts = moment([year, month]).toDate();

    async.waterfall([
        next => {
          db.collection('events')
            .find({
              'repeat': {$gt: 0},
              'starts': {$lt: moment([year, month+1]).toDate()},
            })
            .toArray((err, docs) => {
              if (err) return next(err);

              const limit = moment(starts).add(1, 'months');
              let periodicEvents = [];

              docs.forEach((doc) => {
                const ev = new CalendarEvent(doc);
                let evStarts = moment(ev.starts);

                switch (ev.repeat) {
                  case REPEAT.DAY:
                    while (evStarts.isBefore(limit)) {
                      evStarts.add(1, 'days');
                      if (evStarts.isSame(starts, 'months')) {
                        periodicEvents.push(ev.set('starts', moment(evStarts)));
                      }
                    }
                    break;
                  case REPEAT.WEEK:
                    while (evStarts.isBefore(limit)) {
                      evStarts.add(7, 'days');
                      if (evStarts.isSame(starts, 'months')) {
                        periodicEvents.push(ev.set('starts', evStarts));
                      }
                    }
                    break;
                  case REPEAT.MONTH:
                    while (evStarts.isBefore(limit)) {
                      evStarts.add(1, 'months');
                      if (evStarts.isSame(starts, 'months')) {
                        periodicEvents.push(ev.set('starts', evStarts));
                      }
                    }
                    break;
                  case REPEAT.YEAR:
                    while (evStarts.isBefore(limit)) {
                      evStarts.add(1, 'years');
                      if (evStarts.isSame(starts, 'months')) {
                        periodicEvents.push(ev.set('starts', evStarts));
                      }
                    }
                    break;
                }

              });

              next(null, periodicEvents);
            });
        },

        (events, next) => {
          let result = {
            name: monthstr(month),
            date: starts,
            days: []
          };

          async.timesSeries(
            getMonthLen(year, month),

            (n, done) => {
              const date = moment([year, month, n+1]);
              const nextDate = moment([year, month, n+2]);

              db.collection('events')
                .find({
                  'starts': {
                    '$gte': date.toDate(), 
                    '$lt': nextDate.toDate()
                  }
                })
                .toArray((err, docs) => {
                  result.days.push({
                    date: date.toDate(),
                    events: docs.concat(
                      events.filter(ev => ev.starts.isSame(date, 'days'))
                            .map(ev => ev.set('starts', ev.get('starts').toDate()))
                    ),
                  });

                  done(err);
                });
            },

            err => {
              result.days = addDelta(result.days);

              next(err, result)
            }
          );
        }
      ], 
      
      (err, result) => {
        if (err) console.log(err);

        res.json(result);
      });
  });
  
  // {
  //  event: CalendarEvent
  // }
  router.post('/calendar/events', (req, res) => {
    const ev = {
      starts: moment(req.body.starts).toDate(),
      ends: moment(req.body.ends).toDate(),
      title: req.body.title,
      repeat: req.body.repeat,
    };

    db.collection('events')
      .insertOne(ev, (err, result) => {
        if (err) console.log(err);

        res.json(result.ops[0]);
      });
  });

  const download = (opts, done) => {
    const child = spawn('youtube-dl', [
      '-x', '--audio-format', opts.format, '-o',
      `${opts.dst}/%(title)s.%(ext)s`, opts.url
    ]);
    let err;
    let fullpath;

    child.stdout.on('data', chunk => {
      const dst = chunk.toString()
        .match(/Destination: (.*\.mp3)/);
      if (dst) {
        fullpath = dst[1];
      }
    });

    child.stderr.on('data', msg => {
      err = new Error(msg);
    });

    child.on('close', () => {
      done(err, fullpath); 
    });
  }

  const getMonthLen = (year, month) => {
    return new Date(year, month+1, 0).getDate();
  }

  const addDelta = (days) => {
    const pre = days[0].date.getDay() === 0
      ? 6
      : days[0].date.getDay() - 1;
    const post = days[days.length-1].date.getDay() > 0 
      ? 7 - days[days.length-1].date.getDay()
      : 0;

    return new Array(pre)
      .concat(days, new Array(post));
  }

  const daystr = (i) => {
    return ['Sunday', 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i];
  }

  const monthstr = (i) => {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December'][i];
  }

  app.use('/api', router);
  app.use(express.static('public'));

  app.listen(conf.port);
});

