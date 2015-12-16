'use strict';

const search = require('../search.js');

exports.setup = (router, db) => {
  router.get('/search/:term', (req, res) => {
    Promise.all([
      search.datpiff(req.params.term, 7),
      search.youtube(req.params.term, 7),
    ])
    .then(result => {
      const ret = {
        datpiff: {
          name: 'DatPiff',
          results: result[0],
        },
        youtube: {
          name: 'YouTube',
          results: result[1],
        },
      };

      res.json(ret);
    })
    .catch(err => {
      console.log(err);
      res.status(500).end();
    });
  });
};
