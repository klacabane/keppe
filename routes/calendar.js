'use strict';

const async = require('async');
const moment = require('moment');
const CalendarEvent = require('../public/src/models/event.js').CalendarEvent;
const REPEAT = require('../public/src/models/event.js').REPEAT;

exports.setup = (router, db) => {
  router.get('/calendar/:year/:month', (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const firstOfMonth = moment([year, month]);

    async.waterfall([
        next => {
          db.collection('events')
            .find({
              'repeat': {$gt: 0},
              'starts': {$lt: moment([year, month+1]).toDate()},
            })
            .toArray((err, docs) => {
              if (err) return next(err);

              let periodicEvents = [];
              const limit = moment(firstOfMonth).add(1, 'months');
              const addOccurrences = doc => {
                const ev = new CalendarEvent(doc);
                let d = moment(ev.starts);

                return callback => { 
                  while (d.isBefore(limit)) {
                    if (!d.isSame(ev.starts) && d.isSame(firstOfMonth, 'months')) {
                      periodicEvents.push(
                        ev.set('starts', moment(d))
                      );
                    }

                    callback(d);
                  }
                }
              };

              docs.forEach((doc) => {
                const add = addOccurrences(doc);

                switch (doc.repeat) {
                  case REPEAT.DAY:
                    add(d => d.add(1, 'days'));
                    break;
                  case REPEAT.WEEK:
                    add(d => d.add(7, 'days'));
                    break;
                  case REPEAT.MONTH:
                    add(d => d.add(1, 'months'));
                    break;
                  case REPEAT.YEAR:
                    add(d => d.add(1, 'years'));
                    break;
                }

              });

              next(null, periodicEvents);
            });
        },

        (events, next) => {
          let result = {
            name: monthstr(month),
            date: firstOfMonth.toDate(),
            days: [],
          };

          async.timesSeries(
            firstOfMonth.daysInMonth(),

            (n, done) => {
              const range = {
                starts: moment([year, month, n+1]).toDate(),
                ends: moment([year, month, n+2]).toDate(),
              };

              db.collection('events')
                .find({
                  'starts': {
                    '$gte': range.starts, 
                    '$lt': range.ends,
                  }
                })
                .toArray((err, docs) => {
                  result.days.push({
                    date: range.starts,
                    events: docs.concat(
                      events.filter(ev => ev.starts.isSame(range.starts, 'days'))
                        .map(ev => ev.set('starts', ev.get('starts').toDate()))
                    ),
                  });

                  done(err);
                });
            },

            err => next(err, result)
          );
        }
      ], 
      
      (err, result) => {
        if (err) console.log(err);

        result.days = addDelta(result.days);
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
};
