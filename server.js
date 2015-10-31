'use strict';

const async = require('async');
const express = require('express');
const bodyParser = require('body-parser');
const mongo = require('mongodb').MongoClient;
const conf = {
  db: 'keppe',
  port: 8000
};

mongo.connect(process.env.MONGODB + conf.db, (err, db) => {
  if (err) throw err;

  let app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  let router = express.Router();
  router.get('/items', (req, res) => {
   res.json([{
      id: 1,
      type: 'Music',
      title: ''
    }]);
  });

  router.get('/calendar/:year/:month', (req, res) => {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const days = getDays(year, month);

    let ret = {
      name: monthstr(month),
      days: []
    };
    let day;

    async.whilst(
      () => {
        day = days.next();
        return !day.done;
      },
      (next) => {
        const date = new Date(year, month, day.value, 0, 0, 0, 0);
        const nextDate = new Date(year, month, day.value+1, 0, 0, 0, 0);

        db.collection('events')
          .find({'date': {'$gte': date, '$lt': nextDate}})
          .toArray((err, docs) => {
            ret.days.push({
              date: date,
              daystr: daystr(date.getDay()),
              events: docs
            });

            next(err);
          });
      },
      (err) => {
        if (err) return res.send(500);

        ret.days = addDelta(ret.days);
        res.json(ret);
      }
    );
  });

  const getDays = function* (year, month) {
    let days = new Date(year, month+1, 0).getDate();
    for (let i = 1; i <= days; i++) {
      yield i;
    }
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

