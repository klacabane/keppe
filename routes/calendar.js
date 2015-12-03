'use strict';

const moment = require('moment');
const CalendarEvent = require('../public/src/models/event.js').CalendarEvent;
const REPEAT = require('../public/src/models/event.js').REPEAT;

exports.setup = (router, db) => {
  router.get('/calendar/:year/:month', (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);

    getPeriodicEvents(year, month)
      .then(events => getDays(year, month, events))
      .then(days => {
        res.json({
          date: moment([year, month]).toDate(),
          days: addDelta(days),
        });
      })
      .catch(err => {
        console.log(err);
      });
  });
  
  router.post('/calendar/events', (req, res) => {
    const ev = {
      starts: moment(req.body.starts).toDate(),
      ends: moment(req.body.ends).toDate(),
      title: req.body.title,
      repeat: req.body.repeat,
    };

    db.collection('events')
      .insertOne(ev)
      .then(result => {
        res.json(result.ops[0]);
      })
      .catch(err => {
        console.log(err);
      });
  });

  const getDays = (year, month, periodicEvents) => {
    const getDay = daynum => {
      const range = {
        starts: moment([year, month, daynum]).toDate(),
        ends: moment([year, month, daynum+1]).toDate(),
      };

      return new Promise((resolve, reject) => {
        db.collection('events')
          .find({
            'starts': {
              '$gte': range.starts, 
              '$lt': range.ends,
            }
          })
          .toArray((err, docs) => {
            if (err) return reject(err);

            const day = {
              date: range.starts,
              events: docs.concat(
                periodicEvents
                  .filter(ev => ev.starts.isSame(range.starts, 'days'))
                  .map(ev => ev.set('starts', ev.get('starts').toDate()))
              ),
            };

            resolve(day);
          });
      });
    };
    const len = moment([year, month]).daysInMonth(); 
    const promises = [];
    for (let i = 1; i <= len; i++) {
      promises.push(getDay(i));
    }

    return Promise.all(promises);
  };

  const getPeriodicEvents = (year, month) => {
    return new Promise((resolve, reject) => {
      const firstOfMonth = moment([year, month]);
      const limit = moment(firstOfMonth).add(1, 'months');
      const periodicEvents = [];
      const addOccurrences = doc => {
        const ev = new CalendarEvent(doc);
        let d = moment(ev.starts);
        let add;
        switch (doc.repeat) {
          case REPEAT.DAY:
            add = d => d.add(1, 'days'); break;
          case REPEAT.WEEK:
            add = d => d.add(7, 'days'); break;
          case REPEAT.MONTH:
            add = d => d.add(1, 'months'); break;
          case REPEAT.YEAR:
            add = d => d.add(1, 'years'); break;
        }

        while (d.isBefore(limit)) {
          if (!d.isSame(ev.starts) && d.isSame(firstOfMonth, 'months')) {
            periodicEvents.push(
              ev.set('starts', moment(d))
            );
          }

          add(d);
        }
      };

      db.collection('events')
        .find({
          'repeat': {$gt: 0},
          'starts': {$lt: limit.toDate()},
        })
        .toArray((err, docs) => {
          if (err) return reject(err);
          docs.forEach(addOccurrences);
          resolve(periodicEvents);
        });
    });

  };

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
};
