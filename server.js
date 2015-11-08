'use strict';

const async = require('async');
const bodyParser = require('body-parser');
const express = require('express');
const mongo = require('mongodb').MongoClient;
const moment = require('moment');
const CalendarEvent = require('./public/src/models/event.js').CalendarEvent;
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

  router.get('/items', (req, res) => {
   res.json([{
      id: 1,
      type: 'Music',
      title: '',
    }]);
  });

  router.get('/calendar/:year/:month', (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);

    let ret = {
      name: monthstr(month),
      date: moment([year, month]).toDate(),
      days: []
    };

    async.timesSeries(
      getMonthLen(year, month),

      (n, next) => {
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
            ret.days.push({
              date: date.toDate(),
              events: docs
            });

            next(err);
          });
      },

      err => {
        if (err) console.log(err);

        ret.days = addDelta(ret.days);
        res.json(ret);
      });
  });
  
  // {
  //  event: CalendarEvent
  // }
  router.post('/calendar/events', (req, res) => {
    db.collection('events').insertOne(
      {
        starts: moment(req.body.starts).toDate(),
        ends: moment(req.body.ends).toDate(),
        title: req.body.title,
        repeat: req.body.repeat,
      }, 
      
      (err, result) => {
        if (err) console.log(err);

        res.json(result.ops[0]);
      }
    );
  });

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

