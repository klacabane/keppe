var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var router = express.Router();

router.get('/items', (req, res) => {
  res.json([{
    id: 1,
    type: 'Music',
    title: ''
  }]);
});

router.get('/calendar/:year/:month', (req, res) => {
  var year = parseInt(req.params.year, 10),
    month = parseInt(req.params.month, 10);
  var ret = {
    name: monthstr(month),
    days: []
  };

  var len = getMonthDays(year, month);
  for (var i = 1; i <= len; i++) {
    var day = new Date(year, month, i).getDay();
    // search event for this day

    ret.days.push({
      num: i,
      day: day,
      daystr: daystr(day)
    });
  }

  // compute pre and post delta for a 42days array
  ret.days = addDelta(ret.days);

  res.json(ret);
});

router.post('/calendar/events', (req, res) => {
});

var getMonthDays = (year, month) => {
  return new Date(year, month+1, 0).getDate();
}

var addDelta = (days) => {
  var pre = days[0].day === 0
    ? 6
    : days[0].day - 1;
  var post = days[days.length-1].day > 0 
    ? 7 - days[days.length-1].day
    : 0;

  return new Array(pre)
    .concat(days, new Array(post));
}

var daystr = (i) => {
  return ['Sunday', 'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i];
}

var monthstr = (i) => {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'][i];
}

app.use('/api', router);
app.use(express.static('public'));

app.listen(8000);
