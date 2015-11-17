'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const mongo = require('mongodb').MongoClient;
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

  ['calendar', 'feed']
    .map(ctrl => {
      require(`./routes/${ctrl}.js`)
        .setup(router, db);
    });

  app.use('/api', router);
  app.use(express.static('public'));

  app.listen(conf.port);
});

