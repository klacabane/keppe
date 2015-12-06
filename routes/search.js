'use strict';

const search = require('../search.js');

exports.setup = (router, db) => {
  router.get('/search/:term', (req, res) => {
    Promise.all([
      search.youtube(req.params.term, 5),
      search.datpiff(req.params.term, 5),
    ])
    .then(result => {
      const ret = {
        results: {
          youtube: {
            name: 'YouTube',
            results: result[0],
          },
          datpiff: {
            name: 'DatPiff',
            results: result[1],
          },
        }
      };

      res.json(ret);
    })
    .catch(err => {
      console.log(err);
      res.status(500).end();
    });
  });
};
